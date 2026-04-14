# AgentVault

**Corporate wallet infrastructure for AI agents** — spending policies, approvals, and audit trail.

AgentVault gives companies control over how their AI agents spend money. Set budgets, enforce policies, require approvals, and monitor every transaction in real-time.

## Architecture

```
agentvault/
├── apps/
│   ├── api/            # Express + TypeScript + Prisma backend
│   └── dashboard/      # Next.js + Tailwind admin UI
├── packages/
│   └── sdk/            # TypeScript SDK for AI agents
├── docker-compose.yml  # Postgres + Redis
└── turbo.json          # Monorepo orchestration
```

## Tech Stack

- **API**: Node.js, Express, TypeScript, Prisma ORM, Zod validation
- **Database**: PostgreSQL 16 + Redis 7
- **Dashboard**: Next.js 14, React 18, Tailwind CSS, Recharts
- **SDK**: TypeScript, zero dependencies
- **Auth**: JWT + bcrypt
- **Infra**: Docker Compose, Turborepo

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm 9+

### 1. Clone & install

```bash
git clone https://github.com/westfellow25/smart-wallet-ai-agents.git
cd smart-wallet-ai-agents
npm install
```

### 2. Start database

```bash
docker-compose up -d
```

### 3. Set up environment

```bash
cp .env.example .env
```

### 4. Run migrations & seed

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start dev servers

```bash
# From root
npm run dev
```

- API: http://localhost:3001
- Dashboard: http://localhost:3000
- Prisma Studio: `npm run db:studio`

### Demo credentials

```
Email: admin@acme.ai
Password: demo1234
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create org + first user |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/auth/me` | Current user info |
| GET | `/api/v1/wallets` | List wallets |
| POST | `/api/v1/wallets` | Create wallet |
| POST | `/api/v1/wallets/:id/deposit` | Add funds |
| GET | `/api/v1/agents` | List agents |
| POST | `/api/v1/agents` | Create agent |
| POST | `/api/v1/agents/:id/policies` | Attach policy |
| GET | `/api/v1/transactions` | List transactions |
| POST | `/api/v1/transactions` | Submit spend request |
| POST | `/api/v1/transactions/:id/review` | Approve/reject |
| GET | `/api/v1/policies` | List policies |
| POST | `/api/v1/policies` | Create policy |

## SDK Usage

```typescript
import { AgentVault } from "@agentvault/sdk";

const vault = new AgentVault({
  apiKey: "av_live_...",
  baseUrl: "http://localhost:3001",
});

// Submit a spend request
const { transaction } = await vault.spend({
  amount: 5.00,
  category: "api-call",
  description: "GPT-4 inference",
  merchantName: "OpenAI",
});

console.log(transaction.status); // "COMPLETED" | "PENDING" | "BLOCKED"
```

## License

MIT
