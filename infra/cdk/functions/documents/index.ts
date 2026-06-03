import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type DocumentCategory =
  | "contracts"
  | "insurance"
  | "finance"
  | "identity"
  | "bills"
  | "other";

type DocumentStatus =
  | "needs-review"
  | "protected"
  | "linked-to-contract"
  | "expiring-soon";

type DocumentUploadStatus =
  | "metadata-only"
  | "upload-pending"
  | "uploaded"
  | "failed";

interface ApiGatewayEvent {
  body?: string | null;
  httpMethod?: string;
  isBase64Encoded?: boolean;
  path?: string;
  pathParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    authorizer?: {
      claims?: {
        sub?: string;
      };
    };
  };
}

interface ApiGatewayResponse {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
}

interface DocumentRecord {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  addedAt: string;
  notes?: string;
  linkedContract?: string;
  securityNote: string;
  recommendedAction: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  s3Key?: string;
  uploadStatus: DocumentUploadStatus;
}

interface CreateDocumentInput {
  category?: string;
  name?: string;
  notes?: string;
  status?: string;
}

interface RequestUploadInput extends CreateDocumentInput {
  contentType?: string;
  fileName?: string;
  sizeBytes?: number;
}

const dynamodb = new DynamoDBClient({});
const s3 = new S3Client({});
const tableName = requireEnv("DOCUMENTS_TABLE_NAME");
const bucketName = requireEnv("DOCUMENTS_BUCKET_NAME");
const maxFileSizeBytes = 5 * 1024 * 1024;
const allowedContentTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "content-type": "application/json",
};

export async function handler(
  event: ApiGatewayEvent,
): Promise<ApiGatewayResponse> {
  const requestId = createRequestId("documents");
  const method = event.httpMethod ?? "";
  const userId = getUserId(event);

  if (method === "OPTIONS") {
    return json(200, apiResult({}, requestId));
  }

  if (!userId) {
    return json(
      401,
      apiError("unauthorized", "Missing authenticated user.", requestId),
    );
  }

  try {
    if (method === "GET" && isDocumentsRoot(event)) {
      return await listDocuments(userId, requestId);
    }

    if (method === "POST" && isUploadUrlRoute(event)) {
      return await requestDocumentUpload(event, userId, requestId);
    }

    if (method === "POST" && isCompleteRoute(event)) {
      return await completeDocumentUpload(event, userId, requestId);
    }

    if (method === "POST" && isDocumentsRoot(event)) {
      return await createMetadataOnlyDocument(event, userId, requestId);
    }

    return json(
      400,
      apiError("unsupported_route", "Unsupported documents route.", requestId),
    );
  } catch (caughtError) {
    console.error("Documents API failed", {
      message: caughtError instanceof Error ? caughtError.message : "unknown",
      requestId,
    });

    return json(
      500,
      apiError("internal_error", "Unexpected documents API error.", requestId),
    );
  }
}

async function listDocuments(
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const response = await dynamodb.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
      KeyConditionExpression: "userId = :userId",
      TableName: tableName,
    }),
  );

  const documents = (response.Items ?? []).map(toDocument);

  return json(200, apiResult(documents, requestId));
}

async function createMetadataOnlyDocument(
  event: ApiGatewayEvent,
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJsonBody<CreateDocumentInput>(event);
  const validation = validateDocumentMetadata(input);

  if (!validation.valid) {
    return json(
      400,
      apiError("invalid_document_input", validation.message, requestId),
    );
  }

  const now = new Date().toISOString();
  const documentId = createDocumentId();
  const name = (input.name as string).trim();
  const category = input.category as DocumentCategory;
  const status = input.status as DocumentStatus;
  const document: DocumentRecord = {
    category,
    id: documentId,
    name,
    status,
    addedAt: now,
    notes: normalizeOptionalString(input.notes),
    uploadStatus: "metadata-only",
    securityNote:
      "Stored in DynamoDB as metadata only. No file upload is attached yet.",
    recommendedAction:
      "Review this document metadata and upload a file when needed.",
  };

  await putDocument(userId, document, now);

  return json(200, apiResult(document, requestId));
}

async function requestDocumentUpload(
  event: ApiGatewayEvent,
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJsonBody<RequestUploadInput>(event);
  const validation = validateUploadInput(input);

  if (!validation.valid) {
    return json(400, apiError("invalid_upload_input", validation.message, requestId));
  }

  const now = new Date().toISOString();
  const documentId = createDocumentId();
  const fileName = input.fileName as string;
  const contentType = input.contentType as string;
  const sizeBytes = input.sizeBytes as number;
  const name = input.name as string;
  const safeFileName = sanitizeFileName(fileName);
  const normalizedContentType = contentType.trim();
  const s3Key = `users/${userId}/documents/${documentId}/${safeFileName}`;
  const document: DocumentRecord = {
    category: input.category as DocumentCategory,
    contentType: normalizedContentType,
    fileName: fileName.trim(),
    id: documentId,
    name: name.trim(),
    sizeBytes,
    status: input.status as DocumentStatus,
    addedAt: now,
    notes: normalizeOptionalString(input.notes),
    s3Key,
    uploadStatus: "upload-pending",
    securityNote:
      "Upload URL created. File will be uploaded directly to private S3 storage.",
    recommendedAction:
      "Complete the upload and then link this document to the right record.",
  };

  await putDocument(userId, document, now);

  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    ContentType: normalizedContentType,
    Key: s3Key,
    Metadata: {
      documentId,
      userId,
    },
  });
  const uploadUrl = await getSignedUrl(s3, uploadCommand, {
    expiresIn: 10 * 60,
  });

  return json(
    200,
    apiResult(
      {
        document,
        uploadHeaders: {
          "content-type": normalizedContentType,
        },
        uploadUrl,
      },
      requestId,
    ),
  );
}

async function completeDocumentUpload(
  event: ApiGatewayEvent,
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const documentId =
    event.pathParameters?.documentId ??
    parseJsonBody<{ documentId?: string }>(event).documentId;

  if (!isNonEmptyString(documentId)) {
    return json(
      400,
      apiError("invalid_document_id", "documentId is required.", requestId),
    );
  }

  const existing = await dynamodb.send(
    new GetItemCommand({
      Key: {
        documentId: { S: documentId },
        userId: { S: userId },
      },
      TableName: tableName,
    }),
  );

  if (!existing.Item) {
    return json(
      404,
      apiError("document_not_found", "Document was not found.", requestId),
    );
  }

  if (readString(existing.Item, "uploadStatus") !== "upload-pending") {
    return json(
      400,
      apiError(
        "invalid_upload_status",
        "Document upload is not pending.",
        requestId,
      ),
    );
  }

  const now = new Date().toISOString();

  try {
    const response = await dynamodb.send(
      new UpdateItemCommand({
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(documentId) AND uploadStatus = :pending",
        ExpressionAttributeValues: {
          ":action": {
            S: "Review this uploaded document and link it to the right contract or vault item.",
          },
          ":note": {
            S: "File stored in private S3 storage. Metadata is stored in DynamoDB.",
          },
          ":pending": { S: "upload-pending" },
          ":status": { S: "uploaded" },
          ":updatedAt": { S: now },
        },
        Key: {
          documentId: { S: documentId },
          userId: { S: userId },
        },
        ReturnValues: "ALL_NEW",
        TableName: tableName,
        UpdateExpression:
          "SET uploadStatus = :status, updatedAt = :updatedAt, securityNote = :note, recommendedAction = :action",
      }),
    );

    return json(200, apiResult({ document: toDocument(response.Attributes) }, requestId));
  } catch (caughtError) {
    if (caughtError instanceof ConditionalCheckFailedException) {
      return json(
        400,
        apiError(
          "invalid_upload_status",
          "Document upload could not be completed.",
          requestId,
        ),
      );
    }

    throw caughtError;
  }
}

async function putDocument(
  userId: string,
  document: DocumentRecord,
  now: string,
): Promise<void> {
  const item: Record<string, AttributeValue> = {
    addedAt: { S: document.addedAt },
    category: { S: document.category },
    createdAt: { S: now },
    documentId: { S: document.id },
    id: { S: document.id },
    name: { S: document.name },
    recommendedAction: { S: document.recommendedAction },
    securityNote: { S: document.securityNote },
    status: { S: document.status },
    updatedAt: { S: now },
    uploadStatus: { S: document.uploadStatus },
    userId: { S: userId },
  };

  if (document.notes) {
    item.notes = { S: document.notes };
  }

  if (document.fileName) {
    item.fileName = { S: document.fileName };
  }

  if (document.contentType) {
    item.contentType = { S: document.contentType };
  }

  if (typeof document.sizeBytes === "number") {
    item.sizeBytes = { N: String(document.sizeBytes) };
  }

  if (document.s3Key) {
    item.s3Key = { S: document.s3Key };
  }

  await dynamodb.send(
    new PutItemCommand({
      ConditionExpression:
        "attribute_not_exists(userId) AND attribute_not_exists(documentId)",
      Item: item,
      TableName: tableName,
    }),
  );
}

function validateDocumentMetadata(
  input: CreateDocumentInput,
): { message: string; valid: false } | { valid: true } {
  if (!isNonEmptyString(input.name)) {
    return { message: "name is required.", valid: false };
  }

  if (!isDocumentCategory(input.category)) {
    return { message: "category is invalid.", valid: false };
  }

  if (!isDocumentStatus(input.status)) {
    return { message: "status is invalid.", valid: false };
  }

  return { valid: true };
}

function validateUploadInput(
  input: RequestUploadInput,
): { message: string; valid: false } | { valid: true } {
  const metadataValidation = validateDocumentMetadata(input);

  if (!metadataValidation.valid) {
    return metadataValidation;
  }

  if (!isNonEmptyString(input.fileName)) {
    return { message: "fileName is required.", valid: false };
  }

  if (!isNonEmptyString(input.contentType)) {
    return { message: "contentType is required.", valid: false };
  }

  if (!allowedContentTypes.has(input.contentType)) {
    return { message: "contentType is not allowed.", valid: false };
  }

  if (
    typeof input.sizeBytes !== "number" ||
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0
  ) {
    return { message: "sizeBytes must be a positive number.", valid: false };
  }

  if (input.sizeBytes > maxFileSizeBytes) {
    return { message: "File size must be 5 MB or less.", valid: false };
  }

  if (!sanitizeFileName(input.fileName)) {
    return { message: "fileName is invalid.", valid: false };
  }

  return { valid: true };
}

function isDocumentsRoot(event: ApiGatewayEvent): boolean {
  return event.path === "/documents" || !event.pathParameters?.documentId;
}

function isUploadUrlRoute(event: ApiGatewayEvent): boolean {
  return event.path?.endsWith("/documents/upload-url") ?? false;
}

function isCompleteRoute(event: ApiGatewayEvent): boolean {
  return (
    Boolean(event.pathParameters?.documentId) &&
    (event.path?.endsWith("/complete") ?? false)
  );
}

function isDocumentCategory(value: unknown): value is DocumentCategory {
  return (
    value === "contracts" ||
    value === "insurance" ||
    value === "finance" ||
    value === "identity" ||
    value === "bills" ||
    value === "other"
  );
}

function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    value === "needs-review" ||
    value === "protected" ||
    value === "linked-to-contract" ||
    value === "expiring-soon"
  );
}

function toDocument(
  item: Record<string, AttributeValue> | undefined,
): DocumentRecord {
  const documentId = readString(item, "documentId") ?? readString(item, "id");
  const createdAt = readString(item, "createdAt");

  return {
    addedAt: readString(item, "addedAt") ?? createdAt ?? new Date().toISOString(),
    category: (readString(item, "category") ?? "other") as DocumentCategory,
    contentType: readString(item, "contentType"),
    fileName: readString(item, "fileName"),
    id: documentId ?? "unknown-document",
    linkedContract: readString(item, "linkedContract"),
    name: readString(item, "name") ?? "Untitled document",
    notes: readString(item, "notes"),
    recommendedAction:
      readString(item, "recommendedAction") ??
      "Review this document and link it to the right record.",
    s3Key: readString(item, "s3Key"),
    securityNote:
      readString(item, "securityNote") ??
      "Stored securely in private S3 storage.",
    sizeBytes: readNumber(item, "sizeBytes"),
    status: (readString(item, "status") ?? "protected") as DocumentStatus,
    uploadStatus: (readString(item, "uploadStatus") ??
      "metadata-only") as DocumentUploadStatus,
  };
}

function readString(
  item: Record<string, AttributeValue> | undefined,
  key: string,
): string | undefined {
  const value = item?.[key];

  return value && "S" in value ? value.S : undefined;
}

function readNumber(
  item: Record<string, AttributeValue> | undefined,
  key: string,
): number | undefined {
  const value = item?.[key];
  const rawValue = value && "N" in value ? value.N : undefined;
  const parsedValue = rawValue ? Number(rawValue) : undefined;

  return typeof parsedValue === "number" && Number.isFinite(parsedValue)
    ? parsedValue
    : undefined;
}

function parseJsonBody<T>(event: ApiGatewayEvent): T {
  if (!event.body) {
    return {} as T;
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(rawBody) as T;
}

function getUserId(event: ApiGatewayEvent): string | null {
  return event.requestContext?.authorizer?.claims?.sub ?? null;
}

function json(statusCode: number, body: unknown): ApiGatewayResponse {
  return {
    body: JSON.stringify(body),
    headers: corsHeaders,
    statusCode,
  };
}

function apiResult<T>(data: T, requestId: string) {
  return {
    data,
    requestId,
    source: "aws",
  };
}

function apiError(code: string, message: string, requestId: string) {
  return {
    error: {
      code,
      message,
    },
    requestId,
    source: "aws",
  };
}

function createDocumentId(): string {
  return `document-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(fileName: string): string {
  const fallbackName = "document";

  return (
    fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+/, "")
      .slice(0, 140) || fallbackName
  );
}

function normalizeOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
