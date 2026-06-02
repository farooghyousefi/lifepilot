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
http://localhost:3000/dashboard
```

## AWS Boundary

The CDK app can be built and synthesized locally, but this foundation does not deploy anything.

```bash
pnpm --filter @lifepilot/cdk build
pnpm --filter @lifepilot/cdk synth
```

Do not run `cdk deploy` until AWS accounts, environments, secrets management, and data handling rules are explicitly defined.
