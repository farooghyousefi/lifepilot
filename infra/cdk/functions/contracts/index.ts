import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";
import type {
  ApiErrorResult,
  ApiResult,
  ContractBrainSummary,
  ContractCategory,
  ContractRecord,
  ContractRecordCreateInput,
  ContractRecordUpdateInput,
  MissingFact,
} from "@lifepilot/shared";

interface ApiGatewayEvent {
  body?: string | null;
  httpMethod?: string;
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

type ContractRecordDraft = ContractRecordCreateInput & {
  actionDraft?: ContractRecord["actionDraft"];
  createdAt: string;
  documentId?: string;
  id: string;
  lifecycleStatus?: ContractRecord["lifecycleStatus"];
  offerComparisonIntent?: ContractRecord["offerComparisonIntent"];
  relatedPersonProfileId?: string;
  updatedAt: string;
  userId: string;
};

const dynamodb = new DynamoDBClient({});
const tableName = requireEnv("CONTRACTS_TABLE_NAME");

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "content-type": "application/json",
};

export async function handler(
  event: ApiGatewayEvent,
): Promise<ApiGatewayResponse> {
  const requestId = createRequestId("contracts");
  const method = event.httpMethod ?? "";
  const contractId = event.pathParameters?.contractId;
  const userId = getUserId(event);

  if (method === "OPTIONS") {
    return json(200, apiResult({}, requestId));
  }

  if (!userId) {
    return json(
      401,
      apiError("unauthorized", "Anmeldung fehlt oder ist abgelaufen.", requestId),
    );
  }

  try {
    if (method === "GET" && !contractId) {
      return await listContracts(userId, requestId);
    }

    if (method === "POST" && !contractId) {
      return await createContract(event, userId, requestId);
    }

    if (method === "GET" && contractId) {
      return await getContract(userId, contractId, requestId);
    }

    if (method === "PATCH" && contractId) {
      return await updateContract(event, userId, contractId, requestId);
    }

    if (method === "DELETE" && contractId) {
      return await deleteContract(userId, contractId, requestId);
    }

    return json(
      405,
      apiError("method_not_allowed", "Diese Vertragsroute wird nicht unterstützt.", requestId),
    );
  } catch (error) {
    console.error("Contract API failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });

    return json(
      500,
      apiError("internal_error", "Vertrag konnte nicht verarbeitet werden.", requestId),
    );
  }
}

async function listContracts(
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const result = await dynamodb.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
      KeyConditionExpression: "userId = :userId",
      TableName: tableName,
    }),
  );

  const contracts = (result.Items ?? [])
    .map(readContractRecord)
    .filter((contract): contract is ContractRecord => Boolean(contract))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return json(200, apiResult(contracts, requestId));
}

async function createContract(
  event: ApiGatewayEvent,
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJson<ContractRecordCreateInput>(event.body);

  if (!input || !isValidCreateInput(input)) {
    return json(
      400,
      apiError("invalid_contract_input", "Bitte mindestens Anbieter oder Name angeben.", requestId),
    );
  }

  const now = new Date().toISOString();
  const id = `contract-${randomUUID()}`;
  const record = normalizeContractRecord({
    ...input,
    createdAt: now,
    id,
    updatedAt: now,
    userId,
  });

  await putContract(record);

  return json(201, apiResult(record, requestId));
}

async function getContract(
  userId: string,
  contractId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const record = await fetchContract(userId, contractId);

  if (!record) {
    return json(
      404,
      apiError("contract_not_found", "Vertrag wurde nicht gefunden.", requestId),
    );
  }

  return json(200, apiResult(record, requestId));
}

async function updateContract(
  event: ApiGatewayEvent,
  userId: string,
  contractId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJson<ContractRecordUpdateInput>(event.body);

  if (!input) {
    return json(
      400,
      apiError("invalid_contract_update", "Die Vertragsdaten sind ungültig.", requestId),
    );
  }

  const existing = await fetchContract(userId, contractId);

  if (!existing) {
    return json(
      404,
      apiError("contract_not_found", "Vertrag wurde nicht gefunden.", requestId),
    );
  }

  const record = normalizeContractRecord({
    ...existing,
    ...input,
    confirmedFacts: {
      ...(existing.confirmedFacts ?? {}),
      ...(input.confirmedFacts ?? {}),
    },
    cost: {
      ...existing.cost,
      ...(input.cost ?? {}),
    },
    dates: {
      ...existing.dates,
      ...(input.dates ?? {}),
    },
    facts: {
      ...existing.facts,
      ...(input.facts ?? {}),
    },
    identifiers: {
      ...existing.identifiers,
      ...(input.identifiers ?? {}),
    },
    id: contractId,
    updatedAt: new Date().toISOString(),
    userId,
  });

  await putContract(record);

  return json(200, apiResult(record, requestId));
}

async function deleteContract(
  userId: string,
  contractId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const existing = await fetchContract(userId, contractId);

  if (!existing) {
    return json(
      404,
      apiError("contract_not_found", "Vertrag wurde nicht gefunden.", requestId),
    );
  }

  await dynamodb.send(
    new DeleteItemCommand({
      Key: {
        contractId: { S: contractId },
        userId: { S: userId },
      },
      TableName: tableName,
    }),
  );

  return json(200, apiResult({ contractId, deleted: true }, requestId));
}

async function fetchContract(
  userId: string,
  contractId: string,
): Promise<ContractRecord | null> {
  const result = await dynamodb.send(
    new GetItemCommand({
      Key: {
        contractId: { S: contractId },
        userId: { S: userId },
      },
      TableName: tableName,
    }),
  );

  return result.Item ? readContractRecord(result.Item) : null;
}

async function putContract(record: ContractRecord): Promise<void> {
  await dynamodb.send(
    new PutItemCommand({
      Item: {
        contractId: { S: record.id },
        record: { S: JSON.stringify(record) },
        updatedAt: { S: record.updatedAt },
        userId: { S: record.userId ?? "" },
        ...(record.sourceDocumentId
          ? { sourceDocumentId: { S: record.sourceDocumentId } }
          : {}),
      },
      TableName: tableName,
    }),
  );
}

function normalizeContractRecord(
  input: ContractRecordDraft,
): ContractRecord {
  const missingFacts = input.missingFacts ?? [];
  const dates = input.dates ?? {};
  const cancellation = {
    cancellationDate: dates.cancellationDate,
    cancellationPeriod: input.facts?.cancellationPeriod?.value,
    canPrepareCancellation: missingFacts.length === 0,
  };
  const brain = createBrainSummary(missingFacts, dates.cancellationDate);
  const provider = input.provider ?? input.company;

  return {
    actionDraft: input.actionDraft,
    brain,
    cancellation,
    category: input.category ?? "other",
    company: input.company ?? provider,
    confirmedFacts: input.confirmedFacts,
    cost: {
      currency: "EUR",
      ...(input.cost ?? {}),
    },
    createdAt: input.createdAt,
    dates,
    documentId: input.documentId ?? input.sourceDocumentId,
    facts: input.facts ?? {},
    id: input.id,
    identifiers: input.identifiers ?? {},
    lifecycleStatus: input.lifecycleStatus ?? brain.lifecycleStatus,
    missingFacts,
    name: input.name ?? provider ?? "Unbenannter Vertrag",
    offerComparisonIntent: input.offerComparisonIntent,
    persistenceStatus: "backend-saved",
    provider,
    relatedPersonProfileId: input.relatedPersonProfileId,
    source: input.source ?? "manual",
    sourceDocumentId: input.sourceDocumentId ?? input.documentId,
    updatedAt: input.updatedAt,
    userId: input.userId,
  };
}

function createBrainSummary(
  missingFacts: MissingFact[],
  cancellationDate?: string,
): ContractBrainSummary {
  const today = startOfDay(new Date());
  const parsedCancellationDate = cancellationDate
    ? startOfDay(new Date(`${cancellationDate}T00:00:00.000Z`))
    : undefined;
  const daysUntilCancellation = parsedCancellationDate
    ? Math.ceil(
        (parsedCancellationDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : undefined;
  const isCancellationDeadlineMissed =
    typeof daysUntilCancellation === "number" && daysUntilCancellation < 0;
  const isCancellationWindowUpcoming =
    typeof daysUntilCancellation === "number" &&
    daysUntilCancellation >= 0 &&
    daysUntilCancellation <= 90;
  const lifecycleStatus =
    missingFacts.length > 0
      ? "needs-review"
      : isCancellationDeadlineMissed
        ? "cancellation-deadline-missed"
        : isCancellationWindowUpcoming
          ? "cancellation-window-upcoming"
          : "active";

  return {
    isCancellationDeadlineMissed,
    isCancellationPossibleNow:
      missingFacts.length === 0 && Boolean(isCancellationWindowUpcoming),
    isCancellationWindowUpcoming,
    lifecycleStatus,
    missingFacts,
    nextImportantDate: cancellationDate,
    recommendedAction:
      missingFacts.length > 0
        ? "missing-info-needed"
        : isCancellationWindowUpcoming
          ? "cancellation-draft-ready"
          : "reminder-needed",
  };
}

function readContractRecord(
  item: Record<string, AttributeValue>,
): ContractRecord | null {
  const rawRecord = item.record?.S;

  if (!rawRecord) {
    return null;
  }

  try {
    return JSON.parse(rawRecord) as ContractRecord;
  } catch {
    return null;
  }
}

function isValidCreateInput(input: ContractRecordCreateInput): boolean {
  return Boolean(input.name || input.provider || input.company);
}

function parseJson<T>(body?: string | null): T | null {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function json(statusCode: number, body: unknown): ApiGatewayResponse {
  return {
    body: JSON.stringify(body),
    headers: corsHeaders,
    statusCode,
  };
}

function apiResult<T>(data: T, requestId: string): ApiResult<T> {
  return {
    data,
    requestId,
    source: "aws",
  };
}

function apiError(
  code: string,
  message: string,
  requestId: string,
): ApiErrorResult {
  return {
    error: {
      code,
      message,
    },
    requestId,
    source: "aws",
  };
}

function getUserId(event: ApiGatewayEvent): string | null {
  return event.requestContext?.authorizer?.claims?.sub ?? null;
}

function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
