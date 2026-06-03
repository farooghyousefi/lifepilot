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

    const documentsFunction = this.createPlaceholderFunction(
      "DocumentsFunction",
      "documents",
      {
        AUTH_PROVIDER: "cognito",
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
        DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      },
    );

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
    api.root
      .addResource("documents")
      .addMethod("POST", new LambdaIntegration(documentsFunction), auth);
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
    headers: { "content-type": "application/json" },
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
}
