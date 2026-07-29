#!/usr/bin/env bash
# Managed browser e2e run: starts the local Supabase stack, always stops it
# again — including when tests fail or the run is interrupted.
# Extra arguments are forwarded to Playwright (e.g. --project='Desktop Chrome').
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm run --silent db:start
trap 'pnpm run --silent db:stop' EXIT
pnpm run --silent db:reset
pnpm run --silent test:pw "$@"
