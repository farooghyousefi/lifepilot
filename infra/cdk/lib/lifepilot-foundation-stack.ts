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
} from "aws-cdk-lib/aws-apigateway";
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "node:path";

export class LifePilotFoundationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
    });

    const webUserPoolClient = new UserPoolClient(this, "WebUserPoolClient", {
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      userPool,
    });

    new CfnOutput(this, "UserPoolId", {
      description: "Prepared Cognito User Pool id. Synth-only, not deployed.",
      value: userPool.userPoolId,
    });

    new CfnOutput(this, "WebUserPoolClientId", {
      description:
        "Prepared Cognito app client id. Public client id only, no secret.",
      value: webUserPoolClient.userPoolClientId,
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
      cors: [
        {
          allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Amz-Date",
            "X-Amz-Security-Token",
            "X-Amz-Content-Sha256",
          ],
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["http://localhost:3000"],
          maxAge: 3000,
        },
      ],
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });

    const contractsFunction = this.createContractsFunction({
      AUTH_PROVIDER: "cognito",
      CONTRACTS_TABLE_NAME: contractsTable.tableName,
    });

    const documentsFunction = this.createDocumentsFunction({
      AUTH_PROVIDER: "cognito",
      DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      DOCUMENTS_TABLE_NAME: documentsTable.tableName,
    });

    const remindersFunction = this.createRemindersFunction({
      AUTH_PROVIDER: "cognito",
      REMINDERS_TABLE_NAME: remindersTable.tableName,
    });

    const aiAnalysisFunction = this.createPlaceholderFunction(
      "AiAnalysisFunction",
      "ai-analysis",
      {
        AUTH_PROVIDER: "cognito",
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
        GOALS_TABLE_NAME: goalsTable.tableName,
      },
    );

    contractsTable.grantReadWriteData(contractsFunction);
    documentsTable.grantReadWriteData(documentsFunction);
    documentsBucket.grantReadWrite(documentsFunction);
    remindersTable.grantReadWriteData(remindersFunction);
    goalsTable.grantReadData(aiAnalysisFunction);
    documentsTable.grantReadData(aiAnalysisFunction);

    const api = new RestApi(this, "LifePilotApi", {
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowOrigins: ["http://localhost:3000"],
      },
      deployOptions: {
        stageName: "prod",
      },
      restApiName: "Life Pilot API",
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
      "PATCH",
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

    documentsResource
      .addResource("upload-url")
      .addMethod("POST", new LambdaIntegration(documentsFunction), auth);

    documentsResource
      .addResource("{documentId}")
      .addResource("complete")
      .addMethod("POST", new LambdaIntegration(documentsFunction), auth);

    const remindersResource = api.root.addResource("reminders");

    remindersResource.addMethod(
      "GET",
      new LambdaIntegration(remindersFunction),
      auth,
    );

    remindersResource.addMethod(
      "POST",
      new LambdaIntegration(remindersFunction),
      auth,
    );

    const reminderResource = remindersResource.addResource("{reminderId}");

    reminderResource.addMethod(
      "GET",
      new LambdaIntegration(remindersFunction),
      auth,
    );

    reminderResource.addMethod(
      "PATCH",
      new LambdaIntegration(remindersFunction),
      auth,
    );

    reminderResource.addMethod(
      "DELETE",
      new LambdaIntegration(remindersFunction),
      auth,
    );

    api.root
      .addResource("ai-analysis")
      .addMethod("POST", new LambdaIntegration(aiAnalysisFunction), auth);
  }

  private createTable(id: string, partitionKey: string, sortKey: string): Table {
    return new Table(this, id, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: partitionKey,
        type: AttributeType.STRING,
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
      sortKey: {
        name: sortKey,
        type: AttributeType.STRING,
      },
    });
  }

  private createPlaceholderFunction(
    id: string,
    domain: string,
    environment: Record<string, string>,
  ): Function {
    return new Function(this, id, {
      code: Code.fromInline(`
exports.handler = async function handler(event) {
  const claims = event && event.requestContext && event.requestContext.authorizer
    ? event.requestContext.authorizer.claims || {}
    : {};
  const userId = claims.sub || null;

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
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
      environment,
      handler: "index.handler",
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
    });
  }

  private createContractsFunction(
    environment: Record<string, string>,
  ): NodejsFunction {
    return new NodejsFunction(this, "ContractsFunction", {
      bundling: {
        minify: false,
        sourceMap: true,
      },
      entry: join(__dirname, "..", "..", "functions", "contracts", "index.ts"),
      environment,
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(20),
    });
  }

  private createDocumentsFunction(
    environment: Record<string, string>,
  ): NodejsFunction {
    return new NodejsFunction(this, "DocumentsFunction", {
      bundling: {
        minify: false,
        sourceMap: true,
      },
      entry: join(__dirname, "..", "..", "functions", "documents", "index.ts"),
      environment,
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(20),
    });
  }

  private createRemindersFunction(
    environment: Record<string, string>,
  ): NodejsFunction {
    return new NodejsFunction(this, "RemindersFunction", {
      bundling: {
        minify: false,
        sourceMap: true,
      },
      entry: join(__dirname, "..", "..", "functions", "reminders", "index.ts"),
      environment,
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(20),
    });
  }
}
