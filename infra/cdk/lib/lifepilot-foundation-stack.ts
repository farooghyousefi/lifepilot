import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
  ResponseType,
} from "aws-cdk-lib/aws-apigateway";
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";
import { Bucket, BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class LifePilotFoundationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      signInAliases: {
        email: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const webUserPoolClient = new UserPoolClient(this, "WebUserPoolClient", {
      userPool,
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Prepared Cognito User Pool id. Synth-only, not deployed.",
    });

    new CfnOutput(this, "WebUserPoolClientId", {
      value: webUserPoolClient.userPoolClientId,
      description:
        "Prepared Cognito app client id. Public client id only, no secret.",
    });

    const goalsTable = this.createTable("GoalsTable", "userId", "goalId");
    const remindersTable = this.createTable(
      "RemindersTable",
      "userId",
      "reminderId",
    );
    const contractsTable = this.createTable(
      "ContractsTable",
      "userId",
      "contractId",
    );
    const documentsTable = this.createTable(
      "DocumentsTable",
      "userId",
      "documentId",
    );

    const documentsBucket = new Bucket(this, "DocumentsBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });

    const contractsFunction = this.createPlaceholderFunction(
      "ContractsFunction",
      "contracts",
      {
        AUTH_PROVIDER: "cognito",
    CONTRACTS_TABLE_NAME: contractsTable.tableName,
      },
    );

    const documentsFunction = this.createDocumentsFunction({
      AUTH_PROVIDER: "cognito",
      DOCUMENTS_TABLE_NAME: documentsTable.tableName,
      DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
    });

    const remindersFunction = this.createPlaceholderFunction(
      "RemindersFunction",
      "reminders",
      {
        AUTH_PROVIDER: "cognito",
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    );

    const aiAnalysisFunction = this.createPlaceholderFunction(
      "AiAnalysisFunction",
      "ai-analysis",
      {
        AUTH_PROVIDER: "cognito",
        GOALS_TABLE_NAME: goalsTable.tableName,
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
      },
    );

      contractsTable.grantReadWriteData(contractsFunction);
      documentsTable.grantReadWriteData(documentsFunction);
      documentsBucket.grantReadWrite(documentsFunction);
      remindersTable.grantReadWriteData(remindersFunction);
      goalsTable.grantReadData(aiAnalysisFunction);
      documentsTable.grantReadData(aiAnalysisFunction);

    const api = new RestApi(this, "LifePilotApi", {
      restApiName: "Life Pilot API",
      deployOptions: {
        stageName: "prod",
      },
        defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000"],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Amz-Date",
      "X-Api-Key",
      "X-Amz-Security-Token",
    ],
  },
  

});

    const authorizer = new CognitoUserPoolsAuthorizer(this, "ApiAuthorizer", {
      cognitoUserPools: [userPool],
    });

    const auth = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const contractsResource = api.root.addResource("contracts");
    contractsResource.addMethod(
      "GET",
      new LambdaIntegration(contractsFunction),
      auth,
    );
    contractsResource.addMethod(
      "POST",
      new LambdaIntegration(contractsFunction),
      auth,
    );

    const contractResource = contractsResource.addResource("{contractId}");
    contractResource.addMethod(
      "GET",
      new LambdaIntegration(contractsFunction),
      auth,
    );
    contractResource.addMethod(
      "DELETE",
      new LambdaIntegration(contractsFunction),
      auth,
    );
    const documentsResource = api.root.addResource("documents");

    documentsResource.addMethod(
      "GET",
      new LambdaIntegration(documentsFunction),
      auth,
    );

    documentsResource.addMethod(
      "POST",
      new LambdaIntegration(documentsFunction),
      auth,
    );
    api.root
      .addResource("reminders")
      .addMethod("POST", new LambdaIntegration(remindersFunction), auth);
    api.root
      .addResource("ai-analysis")
      .addMethod("POST", new LambdaIntegration(aiAnalysisFunction), auth);
  }

  private createTable(id: string, partitionKey: string, sortKey: string): Table {
    return new Table(this, id, {
      partitionKey: {
        name: partitionKey,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: sortKey,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      // Development foundation only: retain data on stack removal while the
      // environment model is undefined. Revisit per environment before deploy.
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }

  private createPlaceholderFunction(
    id: string,
    domain: string,
    environment: Record<string, string>,
  ): Function {
    return new Function(this, id, {
      runtime: Runtime.NODEJS_22_X,
      handler: "index.handler",
      timeout: Duration.seconds(10),
      environment,
      code: Code.fromInline(`
exports.handler = async function handler(event) {
  const claims = event?.requestContext?.authorizer?.claims ?? {};
  const userId = claims.sub ?? null;

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    },
    body: JSON.stringify({
      service: "lifepilot-${domain}",
      status: "placeholder",
      authenticated: Boolean(userId),
      message: "Synth-only placeholder. Replace with packaged Lambda code before deployment."
    })
  };
};
`),
    });
  }

  private createDocumentsFunction(environment: Record<string, string>): Function {
    return new Function(this, "DocumentsFunction", {
      runtime: Runtime.NODEJS_22_X,
      handler: "index.handler",
      timeout: Duration.seconds(10),
      environment,
      code: Code.fromInline(`
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({});
const tableName = process.env.DOCUMENTS_TABLE_NAME;

const corsHeaders = {
  "content-type": "application/json",
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function requestId(prefix) {
  return prefix + "-" + Date.now();
}

function result(data, id) {
  return {
    data,
    requestId: id,
    source: "aws",
  };
}

function error(code, message, id) {
  return {
    error: {
      code,
      message,
    },
    requestId: id,
    source: "aws",
  };
}

function getUserId(event) {
  return event && event.requestContext && event.requestContext.authorizer &&
    event.requestContext.authorizer.claims &&
    event.requestContext.authorizer.claims.sub
    ? event.requestContext.authorizer.claims.sub
    : null;
}

function readString(item, key) {
  return item && item[key] && item[key].S ? item[key].S : undefined;
}

function toDocument(item) {
  const documentId = readString(item, "documentId") || readString(item, "id");
  const createdAt = readString(item, "createdAt");

  return {
    id: documentId,
    name: readString(item, "name") || "Untitled document",
    category: readString(item, "category") || "other",
    status: readString(item, "status") || "protected",
    addedAt: readString(item, "addedAt") || createdAt,
    notes: readString(item, "notes"),
    securityNote:
      readString(item, "securityNote") ||
      "Stored as metadata only. No file upload is attached yet.",
    recommendedAction:
      readString(item, "recommendedAction") ||
      "Review this document before enabling uploads.",
  };
}

async function listDocuments(userId, id) {
  const response = await dynamodb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
    }),
  );

  const documents = (response.Items || []).map(toDocument);

  return json(200, result(documents, id));
}

function parseBody(event) {
  if (!event.body) {
    return null;
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(rawBody);
}

function requireString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function createDocument(event, userId, id) {
  let input;

  try {
    input = parseBody(event);
  } catch {
    return json(400, error("invalid_json", "Request body must be valid JSON.", id));
  }

  const name = input && (input.name || input.title);
  const category = input && input.category;
  const status = input && input.status;

  if (!requireString(name) || !requireString(category) || !requireString(status)) {
    return json(
      400,
      error(
        "invalid_document_input",
        "name, category, and status are required.",
        id,
      ),
    );
  }

  const now = new Date().toISOString();
  const documentId = "document-" + Date.now();
  const document = {
    id: documentId,
    name: name.trim(),
    category: category.trim(),
    status: status.trim(),
    addedAt: now,
    notes: requireString(input.notes) ? input.notes.trim() : undefined,
    securityNote: "Stored in DynamoDB as metadata only. No file upload is attached yet.",
    recommendedAction: "Review this document metadata before enabling uploads.",
  };

  const item = {
    userId: { S: userId },
    documentId: { S: documentId },
    id: { S: documentId },
    name: { S: document.name },
    category: { S: document.category },
    status: { S: document.status },
    addedAt: { S: document.addedAt },
    createdAt: { S: now },
    updatedAt: { S: now },
    securityNote: { S: document.securityNote },
    recommendedAction: { S: document.recommendedAction },
  };

  if (document.notes) {
    item.notes = { S: document.notes };
  }

  await dynamodb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression:
        "attribute_not_exists(userId) AND attribute_not_exists(documentId)",
    }),
  );

  return json(200, result(document, id));
}

exports.handler = async function handler(event) {
  const id = requestId("documents");
  const method = event && event.httpMethod;
  const userId = getUserId(event);

  if (method === "OPTIONS") {
    return json(200, result({}, id));
  }

  if (!userId) {
    return json(401, error("unauthorized", "Missing authenticated user.", id));
  }

  try {
    if (method === "GET") {
      return await listDocuments(userId, id);
    }

    if (method === "POST") {
      return await createDocument(event, userId, id);
    }

    return json(400, error("unsupported_method", "Unsupported method.", id));
  } catch (caughtError) {
    console.error("Documents API failed", {
      message: caughtError && caughtError.message,
      requestId: id,
    });

    return json(
      500,
      error("internal_error", "Unexpected documents API error.", id),
    );
  }
};
`),
    });
  }
}
