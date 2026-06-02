# Architecture

Life Pilot is split into product surfaces, shared code, serverless placeholders, and AWS infrastructure preparation.

## Product Surfaces

- `apps/web`: Next.js App Router landing page and `/dashboard` contract dashboard with Tailwind CSS.
- `apps/mobile`: Expo React Native skeleton for the future mobile experience.

Both clients currently use `@lifepilot/api-client` with mock data.

## Phase 2 Contract Dashboard

The `/dashboard` route provides the first contract and cost management surface. It uses local frontend state for adding contracts and mock contract data from `@lifepilot/api-client`.

Current dashboard scope:

- Monthly fixed cost summary
- Active contract count
- Critical cancellation deadline count
- Estimated annual savings potential
- Contract cards for provider, category, monthly cost, deadline, risk, and savings potential
- Local-only add-contract form

There is no database, no API call, and no AWS connection in this phase.

## Shared Packages

- `@lifepilot/shared`: Domain contracts for goals, reminders, documents, contracts, priorities, and API results.
- `@lifepilot/api-client`: Mock-first client with contract mocks, summary helpers, and a future `baseUrl` escape hatch.
- `@lifepilot/ui`: Web UI primitives used by the landing page.

## Phase 3 Contract Backend Foundation

Contract backend preparation is in place without connecting the frontend to AWS:

- `packages/shared` defines `Contract`, `ContractCategory`, `RiskLevel`, `ContractStatus`, `CreateContractInput`, and `ContractSummary`.
- `packages/api-client` exposes `listContracts`, `createContract`, `getContract`, and `deleteContract` with mock fallback behavior.
- `lambdas/contracts` contains handler modules for listing, creating, reading, and deleting contracts.
- `infra/cdk` prepares a DynamoDB contracts table and API Gateway routes for the contract domain.

The dashboard still uses mock data and local state. No real contract data is stored or fetched from AWS in this phase.

## Serverless Domains

- `contracts`: Placeholder for contract analysis and lifecycle checks.
- `documents`: Placeholder for document metadata, uploads, and S3 coordination.
- `reminders`: Placeholder for reminder scheduling and notification orchestration.
- `ai-analysis`: Placeholder for future AI-assisted insights.

## AWS Foundation

The CDK stack prepares:

- Cognito user pool and web client
- DynamoDB tables for goals, reminders, documents, and contracts
- S3 bucket for documents
- REST API resources protected by Cognito authorizer
- Inline placeholder Lambda functions with least-privilege grants

The stack is intentionally synth-only in this foundation.
