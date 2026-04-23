# AgentVault — Investor Demo Script

End-to-end walkthrough optimized for a **15-minute** investor call.

## T-30 minutes: Setup

```bash
# From repo root
./scripts/demo-start.sh
```

This bootstraps: Docker (Postgres + Redis), Prisma migrations, seed data, API, dashboard.
Waits for all services to be ready, then prints URLs.

Open two browser tabs:
1. **Tab 1:** `http://localhost:3000` (landing page)
2. **Tab 2:** `http://localhost:3000/dashboard` (keep signed in during demo)

Open a terminal, leave this ready to hit Enter:
```bash
./scripts/live-demo.sh
```

When you run it, transactions start appearing every ~4 seconds. Save this for the climax.

---

## T-0 to T+15: The call

### 1. The problem (2 min)

> "By 2027, AI agents will be transacting autonomously — buying compute, calling APIs, subscribing to SaaS.
> Today, if you give an AI agent access to a credit card, you have **zero control**. It can spend $10K
> overnight on a runaway loop. No budgets, no approvals, no audit trail.
>
> AgentVault is the financial infrastructure layer for AI agents. Stripe for humans, AgentVault for agents."

### 2. Landing page (30 sec) — Tab 1
- Scroll to hero
- Point at 3 pricing tiers: Starter $199, Growth $599, Enterprise $2K
- Click "Start free trial" → register flow

### 3. The dashboard (2 min) — Tab 2
Point at each section:
- **KPI row:** "This Acme AI Corp has spent $X this month across 5 active agents with 95 transactions"
- **7-day spend chart:** "Trending up — typical for a company rolling out agents"
- **Category donut:** "API calls, cloud compute, storage — the three big buckets"
- **Recent transactions:** "Every spend is logged with merchant, agent, category"

### 4. Per-agent wallets (1 min) → Wallets tab
- Show 5 wallets: Master ($87K), Support ($4.8K), Research ($2.6K), DevOps ($9.3K), Sales ($1.2K)
- "Each agent has isolated budget. Sales agent can never drain DevOps' budget. Master funds sub-wallets on demand."

### 5. Policy Engine (1.5 min) → Policies tab
Point at 4 policies:
- **API Spending Cap** — $50 max per call, only allowed categories
- **High-Value Approval** — >$100 pauses for human review
- **Blocked Categories** — no gambling, crypto, personal
- **Business Hours Only** — Sales agent restricted to 9-18 UTC

> "This is declarative. No code. Finance or security defines rules, devs just attach them to agents."

### 6. 🔥 The live moment (3 min) → Transactions tab
Hit Enter in the terminal to start `live-demo.sh`.

Leave the Transactions tab open. New rows will appear every ~4 seconds.

While watching:
- Point at a COMPLETED transaction — "Auto-approved because it's under the cap"
- When a BLOCKED appears — "Policy engine blocked this in real-time, no human needed"
- Switch to the Approvals section / Dashboard home → pending approvals

**The hook:** click **Approve** on a pending transaction. Balance on wallet goes down. This is real.

> "Everything you just saw — agent spends money, policy evaluates, block/approve decision happens,
> audit log gets written, webhook fires to your Slack — that's the core loop. In production, this
> runs 24/7 behind every AI agent your customers deploy."

### 7. Developer experience (1.5 min) → API Keys tab
- Click "New key" — show the one-time reveal
- Show the SDK snippet (have this ready on a slide):

```python
from agentvault import AgentVault
vault = AgentVault(api_key="av_live_...")
tx = vault.spend(amount=5.00, category="api-call", merchant_name="OpenAI")
# Returns: Transaction(status="COMPLETED") or raises on BLOCKED
```

> "Three lines to integrate. We ship TypeScript and Python SDKs. AI frameworks (LangChain,
> LlamaIndex, AutoGen) plug in via one middleware."

### 8. Webhooks + audit (1 min) → Webhooks tab
- Show webhook setup
- "Every transaction.blocked or approval.required pings Slack/PagerDuty. Enterprise ops teams need this."
- Mention: "Full audit log writes every action. SOC 2 path in Q3."

### 9. Business model (1 min)
> "B2B SaaS. Three tiers: $199 / $599 / $2,000 per month plus 0.1% of transaction volume over plan limits.
> Path to $50K MRR is 25 Growth customers or 5 Enterprise. Current funnel: [your numbers].
> The average company running 10+ agents has an easy $10K/mo AI spend to audit — we're 2% of that,
> paying for itself on the first blocked runaway."

### 10. The ask (1 min)
> "We're raising [$X] to [specific milestones: 10 paying pilots, SOC 2 Type I, Python SDK GA].
> [Timeline]. [Team plans]. [Unit economics bullet]. Questions?"

---

## Kill switch

```bash
./scripts/demo-stop.sh
```

Stops API, dashboard, and Docker. Safe to rerun `demo-start.sh` — seed is idempotent.

---

## Common failure modes (be ready)

| If this happens | Do this |
|---|---|
| Port busy error | `./scripts/demo-stop.sh` then rerun start |
| Dashboard blank | Check `tail .demo-logs/dashboard.log` — usually still compiling |
| "Invalid email" on login | Seed didn't run — `cd apps/api && npx prisma db seed` |
| Live demo doesn't increment | Check `tail .demo-logs/api.log` — API may have crashed |
| Transactions not appearing | Refresh the Transactions tab (we don't have WebSocket yet) |

## Quick recovery

```bash
./scripts/demo-stop.sh && ./scripts/demo-start.sh
```

Full reset takes ~60 seconds.
