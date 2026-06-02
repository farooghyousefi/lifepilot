# Architecture

Life Pilot is split into product surfaces, shared code, serverless placeholders, and AWS infrastructure preparation.

## Product Surfaces

- `apps/web`: Next.js App Router landing page with Tailwind CSS.
- `apps/mobile`: Expo React Native skeleton for the future mobile experience.

Both clients currently use `@lifepilot/api-client` with mock data.

## Shared Packages

- `@lifepilot/shared`: Domain contracts for goals, reminders, documents, priorities, and API results.
- `@lifepilot/api-client`: Mock-first client with a future `baseUrl` escape hatch.
- `@lifepilot/ui`: Web UI primitives used by the landing page.

## Serverless Domains

- `contracts`: Placeholder for contract analysis and lifecycle checks.
- `documents`: Placeholder for document metadata, uploads, and S3 coordination.
- `reminders`: Placeholder for reminder scheduling and notification orchestration.
- `ai-analysis`: Placeholder for future AI-assisted insights.

## AWS Foundation

The CDK stack prepares:

- Cognito user pool and web client
- DynamoDB tables for goals, reminders, and documents
- S3 bucket for documents
- REST API resources protected by Cognito authorizer
- Inline placeholder Lambda functions with least-privilege grants

The stack is intentionally synth-only in this foundation.

