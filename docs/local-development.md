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

## Secrets

Do not commit `.env` files. `.env.example` contains placeholders only.

