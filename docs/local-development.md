# Local Development

Install dependencies from the repository root:

```bash
pnpm install
```

Run all development servers:

```bash
pnpm dev
```

Run one workspace:

```bash
pnpm --filter @lifepilot/web dev
pnpm --filter @lifepilot/mobile dev
```

Run verification:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Mock Data

The API client defaults to mock data. No real backend is called unless `useMockData: false` is explicitly passed and a backend URL is configured.

The web dashboard uses `NEXT_PUBLIC_USE_MOCKS` through its Contract Service:

```bash
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Use `NEXT_PUBLIC_USE_MOCKS=false` only when a local or deployed API-compatible backend is available via `NEXT_PUBLIC_API_BASE_URL`. Do not use real user data for local development.

## Secrets

Do not commit `.env` files. `.env.example` contains placeholders only.
