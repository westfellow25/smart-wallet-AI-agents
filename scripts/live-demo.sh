#!/usr/bin/env bash
# Run the live transaction simulator.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/api"
exec npx ts-node "$ROOT/scripts/live-demo.ts"
