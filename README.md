<div align="center">

# AgentVault

### Corporate wallet for AI agents — spending policies, approvals, audit trail.

[![CI](https://github.com/westfellow25/smart-wallet-AI-agents/actions/workflows/ci.yml/badge.svg)](https://github.com/westfellow25/smart-wallet-AI-agents/actions/workflows/ci.yml)

**If an AI agent is a new hire, AgentVault is its corporate card, its spending limit, and the manager who signs off on the big purchases.**

</div>

* * *

## The problem

Companies are putting AI agents into production — agents that buy ads, call paid
APIs, top up cloud compute, pay for SaaS. The moment an agent can move money,
you have a new problem: **a non-human employee with a credit card and no
judgment.**

A buggy prompt, a hallucinated decision, or a prompt-injection attack and your
agent drains the budget at 3am. Today teams "solve" this with a shared API key,
a spreadsheet, and hope. There is no spending limit, no approval step, no audit
trail — nothing a CFO or a security team would ever sign off on.

AgentVault is the missing financial control layer between your agents and your
money.

* * *

## What you do with it

| Step | Example |
|------|---------|
| **1. Create an agent** | `POST /v1/agents` → you get an API key + a wallet funded with a balance |
| **2. Set spending policies** | "Max $500/tx, $2000/day, only `ads` & `api`, human approval over $200" |
| **3. Drop the SDK into your agent** | `vault.spend({ amount, merchant, category })` — 3 lines |
| **4. Every spend is judged** | Policy Engine returns `APPROVED` / `PENDING` / `BLOCKED` |
| **5. Humans approve the rest** | Pending transactions land in the dashboard with ✓ / ✕ buttons |
| **6. Everything is logged** | Immutable audit trail of every decision, with reasons |

* * *

## AgentVault is for you if

- ✅ You run (or are about to run) AI agents that **spend real money**
- ✅ You need **spending limits** an agent physically cannot exceed
- ✅ You want a **human-in-the-loop** approval step for big or risky purchases
- ✅ You need an **audit trail** for finance, compliance, or investors
- ✅ You'd rather drop in an SDK than build a fintech control plane yourself

* * *

## Features

- 🛡️ **Policy Engine** — per-transaction limit, daily limit, allowed categories, and an approval threshold, combined conservatively across all active policies.
- ⏸ **Human-in-the-loop approvals** — anything above your threshold becomes `PENDING` and waits for a person to approve or reject.
- 🧾 **Immutable audit trail** — every transaction stored with its status and the exact reason it was approved, held, or blocked.
- 🔌 **Drop-in SDKs** — JS/TS and Python, both zero-to-minimal dependencies. Connect an agent in 3 lines.
- 📟 **Live Control Tower** — a dashboard with KPI metrics, a real-time transaction feed, pending approvals, and per-agent wallet health.
- 💳 **Per-agent wallets** — each agent gets its own balance and daily-spend counter, reset automatically each day.
- 🔑 **Agent-scoped API keys** — revoke or pause a single agent without touching the rest.
- 💰 **Usage-based billing** — four subscription tiers ($0 → $2,000/mo) with Stripe Checkout and plan-based agent limits. Runs in dev mode without keys.

* * *

## What's under the hood

```
   Your AI agent
        │  vault.spend({ amount: 30000, merchant: "Meta Ads", category: "ads" })
        ▼
┌─────────────────────────────────────────────┐
│              AgentVault API                  │
│                                              │
│   API key auth ──► Policy Engine             │
│                       │                      │
│      ┌────────────────┼────────────────┐     │
│      ▼                ▼                ▼      │
│   category?       per-tx / daily    approval │
│   allowed?           limits?         needed? │
│      │                │                │     │
│      └──────► APPROVED / PENDING / BLOCKED   │
│                       │                      │
│                       ▼                      │
│              Wallet update + Audit log       │
└─────────────────────────────────────────────┘
        │                         │
        ▼                         ▼
  Control Tower            Human approves
  (live dashboard)         pending spend
```

* * *

## Demo

```bash
# 1. Backend
docker compose up -d                 # Postgres + Redis
cd apps/api && npm install
npm run db:push && npm run db:seed    # prints an agent API key + ready-to-run curl
npm run dev                           # http://localhost:4000

# 2. Watch an agent spend (uses the key from the seed output)
cd ../../packages/sdk
AGENTVAULT_KEY=av_xxx npx ts-node examples/agent.ts
# ✅ $150 Google Ads  -> APPROVED
# ⏸ $300 Meta Ads    -> PENDING  (above $200 approval threshold)
# ⛔ $600 TikTok Ads  -> BLOCKED  (over $500 per-transaction limit)

# 3. Open the product
cd ../../apps/dashboard && npm install && npm run dev
#   http://localhost:3000            -> landing page
#   http://localhost:3000/dashboard  -> live Control Tower
#   http://localhost:3000/billing    -> plans & subscription
```

The dashboard also runs on built-in demo data when the API is offline, so it
always renders for screenshots and investor demos.

* * *

## Tech stack

| Layer      | Tech                                         |
|------------|----------------------------------------------|
| Backend    | Node.js 22, Express, TypeScript              |
| ORM / DB   | Prisma + PostgreSQL                          |
| Cache/queue| Redis                                        |
| Dashboard  | Next.js 15 (App Router), React 19            |
| SDKs       | TypeScript + Python (stdlib only)            |
| Payments   | Stripe / USDC on Base L2 *(roadmap)*         |

* * *

## Quickstart

```bash
git clone https://github.com/westfellow25/smart-wallet-AI-agents.git
cd smart-wallet-AI-agents

docker compose up -d          # Postgres + Redis
cd apps/api
npm install
cp ../../.env.example .env
npm run db:push
npm run db:seed               # copy the printed ORG_ID + AGENT_KEY
npm run dev                   # API on :4000
```

Then in another terminal:

```bash
cd apps/dashboard
npm install
npm run dev                   # landing :3000 · Control Tower :3000/dashboard
```

Connect a real agent with the SDK:

```ts
import { AgentVault } from "@agentvault/sdk";
const vault = new AgentVault({ apiKey: process.env.AGENTVAULT_KEY! });
const d = await vault.spend({ amount: 15000, merchant: "Google Ads", category: "ads" });
if (d.approved) runCampaign();
```

* * *

## What AgentVault is not

- ❌ **Not a bank or a card issuer** (yet) — today it's the policy/approval/audit
  control plane. Real card issuing and USDC settlement are on the roadmap.
- ❌ **Not an agent framework** — it doesn't build your agent. It governs what
  your agent is allowed to spend, no matter which framework you use.
- ❌ **Not a crypto wallet** — amounts are tracked as plain ledger balances; the
  on-chain settlement layer is a later phase.

* * *

## Roadmap

- ✅ **Phase 1 — Backend foundation:** Prisma schema, Policy Engine, audit trail, agent API keys
- ✅ **Phase 2 — Control Tower:** live transaction feed, KPIs, pending approvals, agent wallets
- ✅ **Phase 3 — SDKs:** drop-in JS/TS + Python SDKs with example agents
- ✅ **Phase 4a — Billing:** Stripe subscriptions (4 plans), plan-based agent limits, pricing page, webhooks
- 🟡 **Phase 4b — Polish:** marketing landing + CI ✅ · virtual cards, USDC on Base L2 ⬜

* * *

<div align="center">

Built by [@westfellow25](https://github.com/westfellow25) · MIT License

</div>
