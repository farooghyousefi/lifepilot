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
  ReminderCreateInput,
  ReminderRecord,
  ReminderUpdateInput,
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

const dynamodb = new DynamoDBClient({});
const tableName = requireEnv("REMINDERS_TABLE_NAME");

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
  const requestId = createRequestId("reminders");
  const method = event.httpMethod ?? "";
  const reminderId = event.pathParameters?.reminderId;
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
    if (method === "GET" && !reminderId) {
      return await listReminders(userId, requestId);
    }

    if (method === "POST" && !reminderId) {
      return await createReminder(event, userId, requestId);
    }

    if (method === "GET" && reminderId) {
      return await getReminder(userId, reminderId, requestId);
    }

    if (method === "PATCH" && reminderId) {
      return await updateReminder(event, userId, reminderId, requestId);
    }

    if (method === "DELETE" && reminderId) {
      return await deleteReminder(userId, reminderId, requestId);
    }

    return json(
      405,
      apiError("method_not_allowed", "Diese Erinnerungsroute wird nicht unterstützt.", requestId),
    );
  } catch (error) {
    console.error("Reminder API failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });

    return json(
      500,
      apiError("internal_error", "Erinnerung konnte nicht verarbeitet werden.", requestId),
    );
  }
}

async function listReminders(
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

  const reminders = (result.Items ?? [])
    .map(readReminderRecord)
    .filter((reminder): reminder is ReminderRecord => Boolean(reminder))
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  return json(200, apiResult(reminders, requestId));
}

async function createReminder(
  event: ApiGatewayEvent,
  userId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJson<ReminderCreateInput>(event.body);

  if (!input || !isValidCreateInput(input)) {
    return json(
      400,
      apiError("invalid_reminder_input", "Bitte Titel und Datum angeben.", requestId),
    );
  }

  const now = new Date().toISOString();
  const id = `reminder-${randomUUID()}`;
  const record: ReminderRecord = {
    createdAt: now,
    description: input.description,
    dueDate: input.dueDate,
    id,
    priority: input.priority ?? "medium",
    reminderDate: input.reminderDate,
    sourceContractId: input.sourceContractId,
    sourceDocumentId: input.sourceDocumentId,
    sourceType: input.sourceType ?? "manual",
    status: "open",
    title: input.title.trim(),
    updatedAt: now,
    userId,
  };

  await putReminder(record);

  return json(201, apiResult(record, requestId));
}

async function getReminder(
  userId: string,
  reminderId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const record = await fetchReminder(userId, reminderId);

  if (!record) {
    return json(
      404,
      apiError("reminder_not_found", "Erinnerung wurde nicht gefunden.", requestId),
    );
  }

  return json(200, apiResult(record, requestId));
}

async function updateReminder(
  event: ApiGatewayEvent,
  userId: string,
  reminderId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const input = parseJson<ReminderUpdateInput>(event.body);

  if (!input) {
    return json(
      400,
      apiError("invalid_reminder_update", "Die Erinnerungsdaten sind ungültig.", requestId),
    );
  }

  const existing = await fetchReminder(userId, reminderId);

  if (!existing) {
    return json(
      404,
      apiError("reminder_not_found", "Erinnerung wurde nicht gefunden.", requestId),
    );
  }

  const record: ReminderRecord = {
    ...existing,
    ...input,
    id: reminderId,
    title: input.title?.trim() ?? existing.title,
    updatedAt: new Date().toISOString(),
    userId,
  };

  await putReminder(record);

  return json(200, apiResult(record, requestId));
}

async function deleteReminder(
  userId: string,
  reminderId: string,
  requestId: string,
): Promise<ApiGatewayResponse> {
  const existing = await fetchReminder(userId, reminderId);

  if (!existing) {
    return json(
      404,
      apiError("reminder_not_found", "Erinnerung wurde nicht gefunden.", requestId),
    );
  }

  await dynamodb.send(
    new DeleteItemCommand({
      Key: {
        reminderId: { S: reminderId },
        userId: { S: userId },
      },
      TableName: tableName,
    }),
  );

  return json(200, apiResult({ deleted: true, reminderId }, requestId));
}

async function fetchReminder(
  userId: string,
  reminderId: string,
): Promise<ReminderRecord | null> {
  const result = await dynamodb.send(
    new GetItemCommand({
      Key: {
        reminderId: { S: reminderId },
        userId: { S: userId },
      },
      TableName: tableName,
    }),
  );

  return result.Item ? readReminderRecord(result.Item) : null;
}

async function putReminder(record: ReminderRecord): Promise<void> {
  await dynamodb.send(
    new PutItemCommand({
      Item: {
        dueDate: { S: record.dueDate },
        record: { S: JSON.stringify(record) },
        reminderId: { S: record.id },
        status: { S: record.status },
        updatedAt: { S: record.updatedAt },
        userId: { S: record.userId },
        ...(record.sourceContractId
          ? { sourceContractId: { S: record.sourceContractId } }
          : {}),
        ...(record.sourceDocumentId
          ? { sourceDocumentId: { S: record.sourceDocumentId } }
          : {}),
      },
      TableName: tableName,
    }),
  );
}

function readReminderRecord(
  item: Record<string, AttributeValue>,
): ReminderRecord | null {
  const rawRecord = item.record?.S;

  if (!rawRecord) {
    return null;
  }

  try {
    return JSON.parse(rawRecord) as ReminderRecord;
  } catch {
    return null;
  }
}

function isValidCreateInput(input: ReminderCreateInput): boolean {
  return Boolean(input.title?.trim() && input.dueDate);
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

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
