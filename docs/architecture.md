# Architecture

LifePilot is a personal administration assistant, not a generic AI app. The product is organized around documents, contracts, bills, letters, deadlines, appointments, and next actions for normal non-technical users.

The current architecture is split into product surfaces, shared code, browser-local document intelligence, serverless placeholders, and AWS infrastructure preparation.

## Product Surfaces

- `apps/web`: Next.js App Router landing page, calm LifePilot Command Center, document intake workspace, reminders workspace, and local/dev product routes with Tailwind CSS.
- `apps/mobile`: Expo React Native skeleton for the future mobile experience.

Both clients currently use `@lifepilot/api-client` with mock data. The web dashboard accesses contracts through `apps/web/src/services/contracts` so the data source can switch from mocks to an API Gateway-backed client later.

The web app also exposes local Next.js API routes under `/api` to simulate parts of the API Gateway/Lambda boundary before deployment.

Current web product routes:

- `/login`: public mock sign-in UI
- `/register`: public mock account creation UI
- `/dashboard`: LifePilot Command Center for deadlines, document intake, reminders, contracts, and next actions
- `/contracts`: contract overview, summaries, contract cards, and local add-contract form through `ContractService`
- `/goals`: goals and focus areas
- `/documents`: document overview, presigned-upload-aware workflow, local TXT text extraction, deterministic deadline detection, and detail panel
- `/reminders`: reminder agenda
- `/insights`: recommendation overview
- `/vault`: protected demo document list and security-by-design preparation UI
- `/ai-assistant`: assistant experience placeholder
- `/settings`: settings placeholder

Document intake is intentionally local/dev for analysis. It does not call an AI provider and does not pretend PDF/OCR is complete. Real S3/DynamoDB persistence depends on AWS deployment.

## Command Center + Document Intake Foundation

The first vertical product workflow focuses on the visible LifePilot loop:

1. A document comes in.
2. LifePilot reads what is currently supported.
3. LifePilot detects important dates and possible deadlines.
4. The user reviews and confirms.
5. LifePilot creates a reminder.

Current implementation:

- TXT files are read directly in the browser.
- RTF-like raw markup is detected and not displayed as normal extracted text.
- Extracted text is visible in the document detail panel.
- Simple German date formats are parsed deterministically:
  - `12.06.2026`
  - `12. Juni 2026`
  - phrases such as `bis zum`, `fällig am`, `Kündigungsfrist`, and `Zahlungsfrist`
- Results are shown as "Gefundene Frist / Möglicher Termin" style candidates.
- Results are stored locally in browser `localStorage` under the web client, not in production storage.
- The user can confirm a detected candidate as a reminder.
- Confirmed document reminders are stored locally in browser `localStorage` under `lifepilot:confirmed-reminders:v1`.
- The Command Center reads local analysis and reminder results, then shows confirmed reminders before raw candidate deadlines.
- The `/reminders` workspace shows confirmed document reminders without old static date demos.
- Service boundaries are split for text extraction, PDF extraction placeholder, OCR extraction placeholder, and future backend-only AI analysis.

Current limitations:

- PDF text extraction is represented by a clean placeholder state.
- Image OCR is represented by a clean placeholder state.
- AI provider integration is not implemented and requires a backend-only provider boundary later.
- Local/dev analysis is device-local and not synchronized.
- Local/dev reminders are device-local and not synchronized.
- Production persistence requires AWS credentials, CDK deploy, and live S3/API validation.

Future backend direction:

- Store `DocumentAnalysis` records in DynamoDB under Cognito `userId`.
- Read text from S3 objects in a dedicated Lambda workflow.
- Add OCR for images/scans.
- Add AI analysis behind the API, never from the frontend with raw provider keys.
- Persist confirmed reminders in DynamoDB under Cognito `userId`.
- Later connect reminders to calendar, email, push notifications, and subscription entitlements.

Next product milestones:

1. Real PDF text extraction.
2. Photo OCR.
3. Reminder backend with DynamoDB.
4. Contract Cockpit.
5. AI document explanation through a safe backend boundary.
6. Calendar integration.
7. Email import.
8. Subscription system.
9. Mobile app.

Local API simulation routes:

- `/api/auth/session`: returns a demo auth session.
- `/api/contracts`: lists and creates demo contracts.
- `/api/contracts/{contractId}`: reads and deletes demo contracts.
- `/api/documents`: lists and creates demo document metadata.
- `/api/documents/{documentId}`: reads and deletes demo document metadata.
- `/api/vault`: lists demo vault items.

The local API derives a server-side demo `userId` and ignores any frontend-supplied user id. It accepts a mock bearer token when present, but does not require or create real tokens.

Route boundaries are documented in `apps/web/src/navigation/routes.ts`:

- Public routes: `/`, `/login`, `/register`
- App routes: `/dashboard`, `/contracts`, `/documents`, `/vault`, `/reminders`, `/insights`, `/ai-assistant`, `/settings`

The app routes use `AuthGuard`. Without an active session, users are redirected to `/login?redirect=...`. Cognito can be enabled with `NEXT_PUBLIC_USE_MOCK_AUTH=false`; local mock auth remains available for development.

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

For local API simulation use:

```bash
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## Shared Packages

- `@lifepilot/shared`: Domain contracts for users, auth sessions, goals, reminders, documents, vault items, contracts, priorities, and API results.
- `@lifepilot/api-client`: Mock-first client with auth header helpers, contract, document, and vault mocks plus a `baseUrl` escape hatch for later API Gateway calls.
- `@lifepilot/ui`: Web UI primitives used by the landing page.

## Phase 6 Auth Foundation

The web auth boundary is prepared through a service abstraction:

- `apps/web/src/services/auth` defines `AuthService`, `MockAuthService`, and `CognitoAuthService`.
- `/login` and `/register` support the Cognito-ready flow when `NEXT_PUBLIC_USE_MOCK_AUTH=false`.
- App routes use `AuthGuard` and redirect unauthenticated users to `/login`.
- API client auth helpers can attach bearer headers for the deployed API boundary.

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
