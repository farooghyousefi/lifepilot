import {
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
      selfSignUpEnabled: false,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      signInAliases: {
        email: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new UserPoolClient(this, "WebUserPoolClient", {
      userPool,
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    const goalsTable = this.createTable("GoalsTable", "userId", "goalId");
    const remindersTable = this.createTable(
      "RemindersTable",
      "userId",
      "reminderId",
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
        GOALS_TABLE_NAME: goalsTable.tableName,
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
        DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      },
    );

    const documentsFunction = this.createPlaceholderFunction(
      "DocumentsFunction",
      "documents",
      {
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
        DOCUMENTS_BUCKET_NAME: documentsBucket.bucketName,
      },
    );

    const remindersFunction = this.createPlaceholderFunction(
      "RemindersFunction",
      "reminders",
      {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    );

    const aiAnalysisFunction = this.createPlaceholderFunction(
      "AiAnalysisFunction",
      "ai-analysis",
      {
        GOALS_TABLE_NAME: goalsTable.tableName,
        DOCUMENTS_TABLE_NAME: documentsTable.tableName,
      },
    );

    goalsTable.grantReadWriteData(contractsFunction);
    documentsTable.grantReadWriteData(contractsFunction);
    documentsTable.grantReadWriteData(documentsFunction);
    remindersTable.grantReadWriteData(remindersFunction);
    goalsTable.grantReadData(aiAnalysisFunction);
    documentsTable.grantReadData(aiAnalysisFunction);
    documentsBucket.grantReadWrite(documentsFunction);
    documentsBucket.grantRead(contractsFunction);

    const api = new RestApi(this, "LifePilotApi", {
      restApiName: "Life Pilot API",
      deploy: false,
    });

    const authorizer = new CognitoUserPoolsAuthorizer(this, "ApiAuthorizer", {
      cognitoUserPools: [userPool],
    });

    const auth = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    api.root
      .addResource("contracts")
      .addMethod("GET", new LambdaIntegration(contractsFunction), auth);
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
exports.handler = async function handler() {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      service: "lifepilot-${domain}",
      status: "placeholder",
      message: "Synth-only placeholder. Replace with packaged Lambda code before deployment."
    })
  };
};
`),
    });
  }
}
