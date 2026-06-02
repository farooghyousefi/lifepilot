# AWS Foundation

The CDK project lives in `infra/cdk` and uses AWS CDK v2 with TypeScript.

## Prepared Resources

- Cognito user pool for identity
- DynamoDB tables:
  - `GoalsTable`
  - `RemindersTable`
  - `DocumentsTable`
  - `ContractsTable`
- S3 documents bucket with public access blocked, managed encryption, SSL enforcement, and versioning
- Lambda placeholders for each serverless domain
- REST API paths for contracts, documents, reminders, and AI analysis

## Contract Backend Foundation

The contracts foundation is prepared for future AWS persistence:

- `ContractsTable`
  - Partition key: `userId`
  - Sort key: `contractId`
  - Billing mode: `PAY_PER_REQUEST`
  - Point-in-time recovery enabled for the foundation template
  - `RemovalPolicy.RETAIN` is used as a development safety default while environments are not yet separated

Prepared API routes:

- `GET /contracts`
- `POST /contracts`
- `GET /contracts/{contractId}`
- `DELETE /contracts/{contractId}`

The current Lambda code returns placeholder responses and includes TODOs for DynamoDB access. No real AWS data is read or written until deployment, environment boundaries, IAM review, and persistence code are explicitly added.

## Deployment Status

No deployment is configured or performed by this foundation.

Allowed local commands:

```bash
pnpm --filter @lifepilot/cdk build
pnpm --filter @lifepilot/cdk synth
```

Avoid until explicitly approved:

```bash
cdk deploy
```

## Future Work

- Replace inline CDK Lambda placeholders with packaged Lambda assets.
- Add environment-specific CDK configuration.
- Add Secrets Manager or SSM Parameter Store references for approved secrets.
- Define data retention, encryption, backup, and account boundary rules.
- Add CI checks for synth, typecheck, lint, and app builds.
