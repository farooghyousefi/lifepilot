# LifePilot

LifePilot is an AWS-first personal administration assistant for documents, contracts, bills, deadlines, appointments, and everyday life admin.

The goal is simple: normal users should be able to upload or paste a document, understand what it means, see what matters, and know what they need to do next.

LifePilot is not just another AI chatbot. It is being built as a real product foundation with authentication, document handling, reminders, AI-assisted analysis, and a future AWS backend.

---

## What LifePilot does

LifePilot helps users with everyday administration tasks such as:

* understanding letters, bills, contracts, emails, and official documents
* detecting important dates, deadlines, appointments, and payment due dates
* preparing reminders and tasks
* extracting important facts like amounts, reference numbers, providers, contract dates, and cancellation deadlines
* showing a simple next step instead of raw technical output

Example:

A user pastes a bill with a payment deadline. LifePilot detects the amount, due date, and reference number, then prepares an internal reminder.

---

## Current Status

LifePilot is currently in an MVP development phase.

The web app already supports:

* login flow with mock/dev mode and Cognito-ready architecture
* document upload UI
* local TXT analysis
* text-based PDF extraction when readable text is available
* Smart Brain summaries for uploaded or pasted content
* server-side OpenAI analysis when configured
* deterministic fallback analysis when OpenAI is not available
* local reminder creation from detected deadlines
* duplicate protection for reminders
* better reminder descriptions with amount and payment reference
* Vercel Web Analytics for production page views
* protected LifePilot Brain testing through a private test-code header

Some data is still stored locally in the browser during development. The AWS backend is prepared but not fully deployed and validated yet.

---

## Tech Stack

### Frontend

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* pnpm workspaces
* Turborepo

### Backend / Cloud Foundation

* AWS-first architecture
* AWS CDK foundation
* prepared Lambda handlers
* prepared API Gateway routes
* prepared DynamoDB persistence
* prepared S3 document upload architecture
* Cognito-ready authentication boundary

### AI

* OpenAI server-side integration
* deterministic local fallback
* no OpenAI API key exposed to the browser

### Deployment / DevOps

* GitHub feature branches
* Pull Request workflow
* Vercel preview and production deployments
* Vercel Web Analytics
* local typecheck/build workflow

---

## Repository Structure

```txt
apps/web                 Next.js web app
apps/mobile              Expo React Native skeleton
packages/shared          Shared TypeScript domain types
packages/ui              Shared UI primitives
packages/api-client      Mock-first API client
infra/cdk                AWS CDK foundation
lambdas/contracts        Contracts Lambda placeholder
lambdas/documents        Documents Lambda placeholder
lambdas/reminders        Reminders Lambda placeholder
lambdas/ai-analysis      AI analysis Lambda placeholder
docs                     Architecture and development notes
```

---

## What Works Today

### Documents

* Upload UI is available.
* TXT files can be read and analyzed locally.
* Text-based PDFs can be read when direct text is available.
* Scanned PDFs, photos, and images show an honest OCR-prepared state.
* LifePilot can propose human-readable document names.

### Smart Brain

* LifePilot can summarize documents in simple language.
* It can detect important dates and actions.
* It can show a next step for the user.
* It can use OpenAI from the server when configured.
* It falls back to deterministic logic if OpenAI is unavailable.

### Reminders

* Detected deadlines can be confirmed as local reminders.
* Duplicate reminders are blocked.
* Reminder notes can include amount, due date, and payment reference.
* Payment reminders and high-risk wording are prepared for priority handling.

### Auth

* Mock/dev login works locally.
* Cognito integration is prepared.
* Google and Apple login buttons are visible but only become active when Cognito Hosted UI is configured.

### Analytics

* Vercel Web Analytics is integrated.
* Production page views can be tracked after deployment.

---

## What Is Not Production-Ready Yet

The following parts are prepared but not fully production-ready:

* durable AWS document storage
* deployed DynamoDB persistence for all user data
* cross-device sync
* production OCR for scans and photos
* real Google Calendar / Outlook sync
* email import
* subscription and payment flow
* mobile App Store release
* production-grade AWS security review

Until the AWS backend is fully deployed and validated, local/dev data may still be stored in browser `localStorage`.

---

## Security Rules

This repository must not contain:

* API keys
* secrets
* real private documents
* real user data
* production credentials

OpenAI keys must only be stored as server-side environment variables.

Do not use:

```env
NEXT_PUBLIC_OPENAI_API_KEY
```

because anything prefixed with `NEXT_PUBLIC_` can be exposed to the browser.

Correct server-side variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
LIFEPILOT_BRAIN_TEST_CODE=
```

---

## Environment Variables

### Local development

Create a local environment file for the web app:

```txt
apps/web/.env.local
```

Example:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
LIFEPILOT_BRAIN_TEST_CODE=your-private-test-code
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_USE_MOCK_AUTH=true
```

### Cognito / Hosted UI

Social login requires public Cognito Hosted UI variables:

```env
NEXT_PUBLIC_COGNITO_DOMAIN=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT=http://localhost:3000/login
NEXT_PUBLIC_COGNITO_OAUTH_SCOPES=openid,email,profile
```

Do not put Google or Apple client secrets in frontend environment variables.

---

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the web app:

```bash
pnpm --filter @lifepilot/web dev
```

Open:

```txt
http://localhost:3000
```

Run TypeScript checks:

```bash
pnpm --filter @lifepilot/web typecheck
```

Run all checks from the monorepo root when available:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

---

## Main Local Routes

```txt
/login
/register
/dashboard
/documents
/reminders
/contracts
/insights
/vault
/ai-assistant
/settings
```

---

## AWS Boundary

The AWS CDK foundation can be built and synthesized locally.

```bash
pnpm --filter @lifepilot/cdk build
pnpm --filter @lifepilot/cdk synth
```

Do not run production AWS deployments until the account setup, secrets management, IAM permissions, data handling rules, and cost controls are clearly defined.

Planned AWS production components:

* Cognito for authentication
* S3 for private document storage
* DynamoDB for user-scoped records
* Lambda for backend logic
* API Gateway for backend APIs
* CloudWatch for logs and monitoring
* Secrets Manager or SSM Parameter Store for secrets
* CI/CD pipeline for automated checks and deployment

---

## Current Roadmap

### Next

* improve reminder priority handling
* finish backend persistence validation
* add stronger CI checks with GitHub Actions
* connect document analysis results to durable backend storage
* improve PDF validation across more file types
* add OCR support for scans and photos

### Later

* Google Calendar / Outlook sync
* email import
* subscription system
* mobile app capture flow
* App Store release
* full AWS production deployment

---

## Project Goal

LifePilot is also a learning and portfolio project.

It is built to demonstrate practical skills in:

* TypeScript
* Next.js
* Git and GitHub workflow
* server-side API protection
* environment variable handling
* cloud-ready architecture
* AWS fundamentals
* CI/CD practices
* product-oriented engineering

The long-term goal is to turn LifePilot into a real SaaS/mobile product while using it as a practical DevOps and Cloud Engineering portfolio project.
