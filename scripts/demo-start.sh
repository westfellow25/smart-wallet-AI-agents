#!/usr/bin/env bash
# AgentVault — one-shot demo bootstrap.
# Run from repo root: ./scripts/demo-start.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── Colors ──────────────────────────────────────────────────
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}→${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }

LOG_DIR="$ROOT/.demo-logs"
mkdir -p "$LOG_DIR"

# ─── Pre-flight checks ───────────────────────────────────────
log "Running pre-flight checks..."

command -v node >/dev/null || { err "Node.js not installed"; exit 1; }
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node 18+ required (have $(node -v))"; exit 1
fi
ok "Node $(node -v)"

command -v docker >/dev/null || { err "Docker not installed"; exit 1; }
docker info >/dev/null 2>&1 || { err "Docker daemon not running"; exit 1; }
ok "Docker running"

for port in 3000 3001 5432; do
  if lsof -i ":$port" >/dev/null 2>&1; then
    warn "Port $port is busy. Run ./scripts/demo-stop.sh first, or free it manually."
    exit 1
  fi
done
ok "Ports 3000, 3001, 5432 free"

# ─── Env ─────────────────────────────────────────────────────
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
fi

if [ ! -f apps/dashboard/.env.local ]; then
  cp apps/dashboard/.env.example apps/dashboard/.env.local
fi

# Prisma CLI reads .env from the apps/api dir when run from there,
# so keep a copy alongside the schema.
cp .env apps/api/.env

# ─── Dependencies ────────────────────────────────────────────
if [ ! -d node_modules ]; then
  log "Installing dependencies (first run, ~40s)..."
  npm install >"$LOG_DIR/install.log" 2>&1
  ok "Dependencies installed"
else
  ok "Dependencies already installed"
fi

# ─── Docker (Postgres + Redis) ───────────────────────────────
log "Starting Postgres + Redis..."
docker compose up -d >"$LOG_DIR/docker.log" 2>&1

# Wait for postgres ready
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U agentvault >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
ok "Postgres ready"

# ─── Prisma ──────────────────────────────────────────────────
log "Running Prisma migrations..."
cd apps/api
npx prisma migrate deploy >"$LOG_DIR/migrate.log" 2>&1 || npx prisma migrate dev --name init --skip-seed >"$LOG_DIR/migrate.log" 2>&1
npx prisma generate >>"$LOG_DIR/migrate.log" 2>&1
ok "Schema deployed"

log "Seeding demo data..."
npx prisma db seed >"$LOG_DIR/seed.log" 2>&1
ok "Demo data seeded (5 wallets, 5 agents, 4 policies, ~95 transactions)"

cd "$ROOT"

# ─── Start servers ───────────────────────────────────────────
log "Starting API on :3001..."
(cd apps/api && npm run dev) >"$LOG_DIR/api.log" 2>&1 &
API_PID=$!
echo $API_PID > "$LOG_DIR/api.pid"

log "Starting Dashboard on :3000..."
(cd apps/dashboard && npm run dev) >"$LOG_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo $DASH_PID > "$LOG_DIR/dashboard.pid"

# Wait for servers to be ready
log "Waiting for servers to be ready..."
for i in {1..60}; do
  if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    API_READY=1
    break
  fi
  sleep 1
done
[ "${API_READY:-0}" = "1" ] && ok "API up at http://localhost:3001" || warn "API slow to start — check $LOG_DIR/api.log"

for i in {1..60}; do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    DASH_READY=1
    break
  fi
  sleep 1
done
[ "${DASH_READY:-0}" = "1" ] && ok "Dashboard up at http://localhost:3000" || warn "Dashboard slow to start — check $LOG_DIR/dashboard.log"

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}  🎬 AgentVault demo is LIVE${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Landing:    http://localhost:3000"
echo "  Dashboard:  http://localhost:3000/dashboard"
echo "  API:        http://localhost:3001/health"
echo ""
echo "  Login:      admin@acme.ai / demo1234"
echo ""
echo "  Live feed:  ./scripts/live-demo.sh   (transactions every 3-5s)"
echo "  Stop all:   ./scripts/demo-stop.sh"
echo "  Logs:       tail -f $LOG_DIR/api.log"
echo ""
