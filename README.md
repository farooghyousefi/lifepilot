# LifePilot

LifePilot is an AWS-first TypeScript monorepo for a market-ready personal administration assistant.

LifePilot is not positioned as "another AI app". It helps normal non-technical people understand documents, contracts, bills, letters, deadlines, appointments, and the next actions they need to take.

This repository must not contain API keys, secrets, real user data, or real private documents.

## Current Milestone: Document Knowledge Base + Contract Brain MVP

The web app now focuses on the real LifePilot loop:

1. A document comes in.
2. LifePilot reads what is currently supported.
3. LifePilot detects important dates and possible deadlines.
4. The user reviews and confirms.
5. LifePilot creates a reminder.

What works now:

- `/documents` supports document upload metadata and the presigned S3 upload architecture.
- TXT files can be read locally in the browser.
- RTF-like raw markup is not shown as normal extracted text.
- Simple German dates and deadline contexts are detected deterministically.
- Structured facts are extracted as reviewable candidates: provider, category, identifiers, prices, payment interval, dates, terms, cancellation data, authority references, and related person profile.
- Every extracted fact keeps value, confidence, source snippet, verification status, and `updatedAt`.
- `/documents` now has a "Gefundene Daten prüfen" review section.
- Missing required fields are shown only for the detected category.
- The user can save reviewed facts as a local `ContractRecord` or authority document record.
- `/contracts` is now a local Contract Brain page based on saved `ContractRecord`s.
- Contract Brain calculates lifecycle status, missing facts, next important date, cancellation readiness, and recommended action.
- Contract action draft logic can prepare a local German cancellation draft. It does not send anything.
- Offer comparison creates a local `OfferComparisonIntent` only. No live portal is called.
- Detected candidates are shown as possible deadlines, not as legal facts.
- The user can confirm a detected deadline as a local reminder.
- `/dashboard` uses local knowledge data for contracts, missing facts, possible cancellations, and action suggestions.
- `/reminders` shows locally confirmed reminders with complete/delete actions.
- PDF and photo/OCR paths show honest preparation states. They do not fake extraction.

Local/dev scope:

- TXT analysis runs locally in the browser.
- Analysis results are stored in browser `localStorage` for the current device.
- Extracted facts and Contract Brain records are stored in `localStorage` under `lifepilot.local.knowledge.v1`.
- Confirmed reminders are stored in browser `localStorage` for the current device.
- If the backend is unavailable, `/documents` can still create a clearly labeled local/dev analysis item.
- Local/dev analysis, contract records, action drafts, offer comparison intents, and reminders are not production storage and are not cross-device sync.

Still requires AWS deployment:

- Private S3 upload validation in the deployed environment.
- Persistent document metadata and upload status in DynamoDB.
- User-scoped document storage in S3.
- Persistent `DocumentAnalysis` and reminder records by Cognito user.
- Persistent extracted facts, verified facts, missing facts, ContractRecords, and action drafts in DynamoDB by Cognito user.
- Backend OCR/PDF/AI processing without exposing provider keys to the browser.

Next milestones:

1. Real PDF text extraction.
2. Photo OCR for letters.
3. Backend persistence for documents/contracts/reminders/action drafts.
4. AI structured extraction with source evidence.
5. Contract Cockpit production version.
6. Offer comparison integration.
7. Calendar integration.
8. Email import and email draft creation.
9. Banking/finance aggregation.
10. Mobile camera app.
11. Subscription system.
12. Privacy/security hardening.

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
apps/web                 Next.js App Router landing page and Command Center
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

## Earlier Phase: Contract Dashboard Foundation

An earlier milestone introduced contract and cost management concepts with mock data. The current product direction has moved the active contract experience to `/contracts` as the local Contract Brain.

The current Command Center uses browser-local knowledge data and still does not deploy AWS or use production persistence.

## Phase 3: Contract Backend Foundation

The AWS backend foundation now prepares contract persistence and routes without deploying them:

- DynamoDB `ContractsTable` with `userId` partition key and `contractId` sort key
- Contract Lambda handler modules for list, create, get, and delete
- API Gateway route plan for `GET /contracts`, `POST /contracts`, `GET /contracts/{contractId}`, and `DELETE /contracts/{contractId}`
- API client methods with mock fallback so the dashboard remains local-first

No real AWS data is written in this phase.

## Earlier Phase: Contract Service Mode

The original contract service abstraction is still present for API-client compatibility. Local development can still use mock API data:

```bash
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

`NEXT_PUBLIC_USE_MOCKS=true` uses local mock API data. Set `NEXT_PUBLIC_USE_MOCKS=false` plus `NEXT_PUBLIC_API_BASE_URL` later to use API-client calls. This is only a technical switch; no AWS deployment is performed by the web app.

## Product UI Expansion

The web app now includes a calm LifePilot app shell with shared navigation and workspaces for the Command Center, Contract Brain, documents, reminders, insights, vault, assistant, and settings. Documents use a presigned-upload-aware architecture, but local analysis, knowledge records, contracts, action drafts, and reminders remain browser-local until the AWS backend is deployed and validated. No external AI provider is called from the frontend.

## Phase 5: Documents & Vault

The `/documents` and `/vault` workspaces include document organization, document details, protected vault messaging, and security-by-design preparation. `/documents` can use the API client upload flow when configured, and it falls back to a clearly labeled local/dev item when the backend is unavailable.

Do not use sensitive real documents in local/dev mode. Browser-local analysis and reminders are not secure production persistence. See `docs/security.md` for the planned security boundary before broad real document handling.

## Phase 6: Auth & Security Foundation

The web app includes `/login` and `/register`, an `AuthService` abstraction, shared auth types, API client auth header helpers, and protected app routes through `AuthGuard`. Local mock auth remains available for development, while Cognito can be enabled through environment variables.

No Cognito secrets or plaintext passwords are stored in the repository.

## Phase 7: Local API Simulation

The web app now includes local Next.js API routes that simulate the future API Gateway/Lambda boundary:

- `GET /api/auth/session`
- `GET/POST /api/contracts`
- `GET/DELETE /api/contracts/{contractId}`
- `GET/POST /api/documents`
- `GET/DELETE /api/documents/{documentId}`
- `GET /api/vault`

Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api` to route supported clients through the local API simulation. This still uses mock data only and does not connect to AWS.

## Document Knowledge Base + Contract Brain

The current MVP adds a browser-local knowledge layer in `apps/web/src/services/knowledge`.

Local storage key:

```text
lifepilot.local.knowledge.v1
```

It stores:

- extracted document facts by `documentId`
- verified/corrected facts
- missing required facts by category
- local `ContractRecord`s
- local cancellation drafts
- local offer comparison intents

Important boundaries:

- Facts start as candidates.
- The user confirms or corrects facts once.
- Missing required fields are category-specific.
- LifePilot must not repeatedly ask for known facts.
- Cancellation drafts are only drafts.
- Offer comparison is only planned metadata.
- No automatic cancellation, email sending, banking call, comparison portal call, or external AI call happens in this milestone.

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
