# AgentVault

**Corporate wallet infrastructure for AI agents** — spending policies, approvals, audit trail.

AgentVault gives companies control over how their AI agents spend money. Set budgets, enforce policies, require human approvals on high-value transactions, and audit every dollar in real-time.

## Monorepo structure

```
agentvault/
├── apps/
│   ├── api/            # Express + TypeScript + Prisma backend
│   └── dashboard/      # Next.js 14 + Tailwind admin UI
├── packages/
│   ├── sdk/            # TypeScript SDK
│   └── python-sdk/     # Python SDK
├── docker-compose.yml  # Postgres + Redis
├── railway.json        # Railway deploy config
└── turbo.json          # Monorepo orchestration
```

## Features

- **Multi-tenant wallets** — master, department, per-agent wallets with limits
- **Policy Engine** — configurable rules: max amounts, categories, time windows
- **Approval workflows** — pause high-value transactions for human review
- **API Keys** — scoped keys for agents (one-time display, bcrypt-hashed storage)
- **Webhooks** — HMAC-signed event delivery for `transaction.blocked`, `approval.required`, etc.
- **Analytics** — spend by day / category / agent, KPIs, trending
- **Audit log** — every sensitive action logged
- **Rate limiting** — per-endpoint protection (auth, transactions, general)
- **Billing stubs** — Stripe-ready plans (Starter $199, Growth $599, Enterprise $2000)
- **Landing + pricing page** — conversion-ready marketing site

## Tech Stack

- **API**: Node.js, Express, TypeScript, Prisma, Zod, bcrypt, JWT, express-rate-limit
- **Database**: PostgreSQL 16 + Redis 7
- **Dashboard**: Next.js 14 (App Router), React 18, Tailwind CSS
- **SDKs**: TypeScript (fetch), Python (httpx)
- **Infra**: Docker, Turborepo, Railway/Vercel-ready

## Quick Start

### Prerequisites
- Node.js 18+, Docker, npm 9+

### Setup

```bash
# Install deps
npm install

# Start DB
docker-compose up -d

# Configure env
cp .env.example .env
cp apps/dashboard/.env.example apps/dashboard/.env.local

# Migrate + seed
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed

# Start dev servers (from root)
cd ../.. && npm run dev
```

- API: http://localhost:3001
- Dashboard: http://localhost:3000
- Login: `admin@acme.ai` / `demo1234`

## API Reference

### Auth
- `POST /api/v1/auth/register` — create org + owner
- `POST /api/v1/auth/login` — get JWT
- `GET /api/v1/auth/me` — current user

### Wallets
- `GET /api/v1/wallets`
- `POST /api/v1/wallets`
- `PATCH /api/v1/wallets/:id`
- `POST /api/v1/wallets/:id/deposit`

### Agents
- `GET /api/v1/agents`
- `POST /api/v1/agents`
- `PATCH /api/v1/agents/:id`
- `POST /api/v1/agents/:id/policies`

### Transactions
- `GET /api/v1/transactions?status=&agentId=`
- `POST /api/v1/transactions` — submit spend (evaluates policies)
- `POST /api/v1/transactions/:id/review` — approve/reject

### Policies, API Keys, Webhooks, Analytics, Audit, Billing
See respective route files under `apps/api/src/routes/`.

## SDK Usage

**TypeScript:**
```typescript
import { AgentVault } from "@agentvault/sdk";
const vault = new AgentVault({ apiKey: "av_live_..." });
const { transaction } = await vault.spend({
  amount: 5.00, category: "api-call", merchantName: "OpenAI"
});
```

**Python:**
```python
from agentvault import AgentVault
vault = AgentVault(api_key="av_live_...")
tx = vault.spend(amount=5.00, category="api-call")
```

## Testing

```bash
# Run all API tests (unit + integration)
cd apps/api && npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Tests include:
- **Unit tests** for policy engine (rules, categories, time windows, multi-policy)
- **Unit tests** for API key generation + verification (bcrypt)
- **Integration tests** for auth flow (register, login, bad credentials) using supertest + mocked Prisma

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and PR:
- API: lint (tsc), Prisma generate, build, tests
- Dashboard: type check, Next.js build
- TypeScript SDK: build
- Python SDK: install + import check

## Deployment

- **Dashboard** → Vercel (`vercel.json` included)
- **API** → Railway (`railway.json` with Dockerfile) or any Docker host
- **DB** → Neon / Supabase / Railway Postgres

## License

MIT
