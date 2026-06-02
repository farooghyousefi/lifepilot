# Architecture

Life Pilot is split into product surfaces, shared code, serverless placeholders, and AWS infrastructure preparation.

## Product Surfaces

- `apps/web`: Next.js App Router landing page, calm Life Pilot dashboard shell, and local mock product routes with Tailwind CSS.
- `apps/mobile`: Expo React Native skeleton for the future mobile experience.

Both clients currently use `@lifepilot/api-client` with mock data. The web dashboard accesses contracts through `apps/web/src/services/contracts` so the data source can switch from mocks to an API Gateway-backed client later.

Current web product routes:

- `/login`: public mock sign-in UI
- `/register`: public mock account creation UI
- `/dashboard`: overview dashboard
- `/contracts`: contract overview, summaries, contract cards, and local add-contract form through `ContractService`
- `/goals`: goals and focus areas
- `/documents`: document overview, category filtering, demo upload metadata, and detail panel
- `/reminders`: reminder agenda
- `/insights`: recommendation overview
- `/vault`: protected demo document list and security-by-design preparation UI
- `/ai-assistant`: assistant experience placeholder
- `/settings`: settings placeholder

These routes are frontend-only mock surfaces. They do not upload documents, call AI providers, connect to AWS, or store real user data.

Route boundaries are documented in `apps/web/src/navigation/routes.ts`:

- Public routes: `/`, `/login`, `/register`
- App routes: `/dashboard`, `/contracts`, `/documents`, `/vault`, `/reminders`, `/insights`, `/ai-assistant`, `/settings`

The app routes are prepared as protected areas, but no hard auth guard is enforced until real Cognito integration is implemented.

## Phase 2 Contract Dashboard

The `/dashboard` route provides the first contract and cost management surface. It loads contracts through `ContractService`, which selects either `MockContractService` or `ApiContractService`.

Current dashboard scope:

- Monthly fixed cost summary
- Active contract count
- Critical cancellation deadline count
- Estimated annual savings potential
- Contract cards for provider, category, monthly cost, deadline, risk, and savings potential
- Add-contract form backed by the same contract service

`NEXT_PUBLIC_USE_MOCKS=true` keeps local mock data enabled. `NEXT_PUBLIC_USE_MOCKS=false` switches the service to API client requests against `NEXT_PUBLIC_API_BASE_URL`. There is still no AWS deployment or real user data in local development.

## Shared Packages

- `@lifepilot/shared`: Domain contracts for users, auth sessions, goals, reminders, documents, vault items, contracts, priorities, and API results.
- `@lifepilot/api-client`: Mock-first client with auth header helpers, contract, document, and vault mocks plus a `baseUrl` escape hatch for later API Gateway calls.
- `@lifepilot/ui`: Web UI primitives used by the landing page.

## Phase 6 Auth Foundation

The web auth boundary is prepared without real authentication:

- `apps/web/src/services/auth` defines `AuthService`, `MockAuthService`, and a future `CognitoAuthService`.
- `/login` and `/register` use mock flows only.
- The dashboard header includes a mock user avatar and sign-out action.
- API client auth helpers can attach a bearer header later, but no real token is created in this phase.

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

Lambda placeholders are prepared to read the future authenticated user id from API Gateway Cognito JWT claims, using `claims.sub`. Frontend-supplied `userId` must not be trusted for real data access.

The stack is intentionally synth-only in this foundation.
