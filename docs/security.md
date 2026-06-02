# Security Notes

Life Pilot is still in demo mode. Do not upload or enter real documents, real user data, secrets, API keys, identification records, insurance data, financial data, or other sensitive information.

## Current Phase

- Auth is mock-only.
- Documents and Vault are mock UI only.
- Demo upload stores metadata in local frontend state only.
- No real file is uploaded.
- No AWS resource is deployed.
- No document data is written to S3, DynamoDB, or external APIs.
- No real user accounts, passwords, tokens, or Cognito secrets are stored.
- No sensitive data should be logged.
- Local `/api` routes use in-memory demo data only.
- Local `/api` routes simulate server-side `userId`; frontend-supplied user ids must be ignored.

## Planned AWS Boundary

Before real documents are allowed, the storage design must include:

- Private S3 buckets only.
- No public S3 object URLs.
- Signed URLs for temporary, scoped document access.
- Cognito user isolation through `userId`.
- API Gateway Cognito Authorizer for protected API routes.
- `userId` derived from JWT claims, especially `claims.sub`, not from the frontend request body.
- Every data query scoped to the authenticated `userId`.
- Server-side encryption with S3/KMS.
- Least-privilege IAM policies for document Lambdas.
- Delete functionality before real data is accepted.
- Audit-friendly handling that avoids sensitive payloads in logs.
- No secrets in the repository.

## Product Rule

The app must show clear demo-mode messaging until the secure upload, access, and delete path has been implemented and reviewed.
