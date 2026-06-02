# Life Pilot

Life Pilot is an AWS-first TypeScript monorepo foundation for a personal operating system across goals, documents, reminders, contracts, and AI-assisted life admin.

This repository is intentionally scaffolded without real deployments, API keys, secrets, or user data.

## Stack

- pnpm Workspaces
- Turborepo
- TypeScript
- Next.js App Router web app
- Expo React Native mobile skeleton
- Shared types, UI primitives, and mock API client
- AWS CDK v2 foundation
- Lambda placeholders for contracts, documents, reminders, and AI analysis

## Structure

```text
apps/web                 Next.js App Router landing page and mock dashboard
apps/mobile              Expo React Native skeleton
packages/shared          Shared domain types
packages/ui              Small web UI primitives
packages/api-client      Mock-first Life Pilot API client
infra/cdk                AWS CDK v2 foundation, synth-only
lambdas/contracts        Contract Lambda placeholder
lambdas/documents        Document Lambda placeholder
lambdas/reminders        Reminder Lambda placeholder
lambdas/ai-analysis      AI analysis Lambda placeholder
docs                     Architecture and development docs
```

## Phase 2: Contract Dashboard

The web app includes a mock contract dashboard at `/dashboard` for contract and cost management. It shows monthly fixed costs, active contracts, critical cancellation deadlines, estimated annual savings potential, contract cards, and a local add-contract form.

The dashboard currently runs with mock data only. It does not call AWS, does not use a database, and does not send contract data to any API.

## Phase 3: Contract Backend Foundation

The AWS backend foundation now prepares contract persistence and routes without deploying them:

- DynamoDB `ContractsTable` with `userId` partition key and `contractId` sort key
- Contract Lambda handler modules for list, create, get, and delete
- API Gateway route plan for `GET /contracts`, `POST /contracts`, `GET /contracts/{contractId}`, and `DELETE /contracts/{contractId}`
- API client methods with mock fallback so the dashboard remains local-first

No real AWS data is written in this phase.

## Phase 4: Contract Service Mode

The dashboard loads contracts through `apps/web/src/services/contracts` instead of importing mock data directly. Local development defaults to mocks:

```bash
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

`NEXT_PUBLIC_USE_MOCKS=true` uses `MockContractService` with local mock contracts. Set `NEXT_PUBLIC_USE_MOCKS=false` plus `NEXT_PUBLIC_API_BASE_URL` later to use `ApiContractService`, which delegates to `@lifepilot/api-client` and is ready for an API Gateway URL. This is only a technical switch; no AWS deployment is performed by the web app.

## Product UI Expansion

The web app now includes a calm Life Pilot dashboard shell with shared navigation and local mock workspaces for contracts, goals, documents, reminders, insights, vault, AI assistant, and settings. The contracts workspace uses `ContractService`, so local mock mode and the future API mode share the same UI boundary. Documents, Vault, and AI Assistant are UI-only in this phase. No files are uploaded, no model calls are made, and no AWS services are contacted.

## Phase 5: Documents & Vault

The `/documents` and `/vault` workspaces now include richer mock UI for document organization, demo upload metadata, document details, protected vault items, and security-by-design messaging. They use shared document and vault types plus mock-first API client methods.

Do not use real documents in this phase. The upload flow is a demo interaction only and does not upload files or store real data. See `docs/security.md` for the planned security boundary before any real document handling.

## Phase 6: Auth & Security Foundation

The web app includes mock auth pages at `/login` and `/register`, an `AuthService` abstraction, shared auth types, and API client auth header helpers. Local auth is mock-only. Cognito is prepared in CDK as a synth-only foundation with a user pool, web client, and API Gateway authorizer.

No real users, tokens, passwords, or Cognito secrets are stored in this phase.

## Getting Started

```bash
pnpm install
pnpm dev
```

Run checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Run individual apps:

```bash
pnpm --filter @lifepilot/web dev
pnpm --filter @lifepilot/mobile dev
```

Local web routes:

```text
http://localhost:3000/
http://localhost:3000/login
http://localhost:3000/register
http://localhost:3000/dashboard
http://localhost:3000/contracts
http://localhost:3000/goals
http://localhost:3000/documents
http://localhost:3000/reminders
http://localhost:3000/insights
http://localhost:3000/vault
http://localhost:3000/ai-assistant
http://localhost:3000/settings
```

## AWS Boundary

The CDK app can be built and synthesized locally, but this foundation does not deploy anything.

```bash
pnpm --filter @lifepilot/cdk build
pnpm --filter @lifepilot/cdk synth
```

Do not run `cdk deploy` until AWS accounts, environments, secrets management, and data handling rules are explicitly defined.
