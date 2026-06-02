# Security Notes

Life Pilot is still in demo mode. Do not upload or enter real documents, real user data, secrets, API keys, identification records, insurance data, financial data, or other sensitive information.

## Current Phase

- Documents and Vault are mock UI only.
- Demo upload stores metadata in local frontend state only.
- No real file is uploaded.
- No AWS resource is deployed.
- No document data is written to S3, DynamoDB, or external APIs.
- No sensitive data should be logged.

## Planned AWS Boundary

Before real documents are allowed, the storage design must include:

- Private S3 buckets only.
- No public S3 object URLs.
- Signed URLs for temporary, scoped document access.
- Cognito user isolation through `userId`.
- Server-side encryption with S3/KMS.
- Least-privilege IAM policies for document Lambdas.
- Delete functionality before real data is accepted.
- Audit-friendly handling that avoids sensitive payloads in logs.

## Product Rule

The app must show clear demo-mode messaging until the secure upload, access, and delete path has been implemented and reviewed.
