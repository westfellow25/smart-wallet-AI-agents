# Deploying AgentVault

Two pieces deploy independently:

| Piece | Where | Needs a backend? |
|-------|-------|------------------|
| **Dashboard** (`apps/dashboard`) | **Vercel** | No — runs on built-in demo data |
| **API** (`apps/api`) | **Render / Railway** | Postgres |

The fastest path to a shareable link is **just the dashboard on Vercel** — it
renders the full product on demo data with zero backend. Add the API later to
make it multi-user with real persistence.

---

## 1. Dashboard → Vercel (5 minutes, no backend)

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `westfellow25/smart-wallet-AI-agents`.
2. **Important — set Root Directory to `apps/dashboard`** (Vercel → project
   settings → General → Root Directory).
3. Framework preset: **Next.js** (auto-detected). Leave build/output as default.
4. *(Optional)* To connect a live API later, add an env var:
   - `AGENTVAULT_API_URL` = `https://<your-api>.onrender.com`
   Without it, the dashboard stays in demo mode — perfect for a public demo.
5. **Deploy.** You get `https://<project>.vercel.app`.

That URL is what you put in front of investors: landing → Control Tower →
Payments → Cards → Agents → Billing, all live on demo data.

---

## 2. API → Render (Postgres included)

### Option A — Blueprint (one click)
1. Push this repo to GitHub (already done).
2. Go to [Render](https://render.com) → **New + → Blueprint** → pick the repo.
   Render reads [`render.yaml`](./render.yaml) and provisions:
   - a Docker web service (`agentvault-api`) built from `apps/api/Dockerfile`
   - a free PostgreSQL database, wired to `DATABASE_URL`
   - an auto-generated `JWT_SECRET`
3. Deploy. The container runs `prisma db push` on boot, so the schema is created
   automatically. Health check: `GET /health`.
4. *(Optional, for billing)* add Stripe keys in the service's Environment tab:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`.

### Option B — Railway
1. [railway.app](https://railway.app) → New Project → Deploy from repo.
2. Add a **PostgreSQL** plugin; Railway sets `DATABASE_URL`.
3. Service settings → Build: Dockerfile at `apps/api/Dockerfile` (context = repo root).
4. Add env var `JWT_SECRET` (any long random string).

### Seed a demo account (optional)
From your machine, pointed at the deployed DB:
```bash
cd apps/api
DATABASE_URL="<render/railway postgres url>" npm run db:seed
# login: demo@agentvault.dev / demodemo
```

---

## 3. Wire them together (for the full live product)

1. On **Vercel**, set `AGENTVAULT_API_URL` to your Render/Railway API URL and redeploy.
2. On the **API**, set `DASHBOARD_URL` to your Vercel URL (used for Stripe redirects).
3. Now: anonymous visitors see demo data; signed-in users (via `/login`) get real,
   persisted, per-organization data.

---

## Environment variables reference

**API** (`apps/api`)
| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | sign auth tokens |
| `PORT` | no | defaults to 4000 |
| `STRIPE_SECRET_KEY` | no | enables real billing |
| `STRIPE_PRICE_STARTER/GROWTH/SCALE` | no | Stripe price ids |
| `DASHBOARD_URL` | no | Stripe success/cancel redirects |

**Dashboard** (`apps/dashboard`)
| Var | Required | Notes |
|-----|----------|-------|
| `AGENTVAULT_API_URL` | no | point at deployed API; omit for demo mode |
