#!/usr/bin/env bash
# Cleanly stop the AgentVault demo (API, dashboard, Docker).
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.demo-logs"

kill_from_pid_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  local pid
  pid=$(cat "$file")
  if kill -0 "$pid" 2>/dev/null; then
    # Kill the whole process group (node spawns children)
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    echo "  Stopped PID $pid"
  fi
  rm -f "$file"
}

echo "Stopping AgentVault demo..."

kill_from_pid_file "$LOG_DIR/api.pid"
kill_from_pid_file "$LOG_DIR/dashboard.pid"

# Fallback: kill anything on demo ports
for port in 3000 3001; do
  pid=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    echo "  Killed process on port $port"
  fi
done

# Stop Docker (optional; keep it running if DEMO_KEEP_DB=1)
if [ "${DEMO_KEEP_DB:-0}" != "1" ]; then
  docker compose down 2>/dev/null && echo "  Stopped Postgres + Redis"
else
  echo "  Keeping Docker running (DEMO_KEEP_DB=1)"
fi

echo "Done."
