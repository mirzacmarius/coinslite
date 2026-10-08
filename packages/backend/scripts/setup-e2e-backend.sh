#!/usr/bin/env bash
# Configures an anonymous local Convex deployment for end-to-end tests: no
# Convex account needed, and emails land in the dev outbox instead of being sent.
# Usage: bash scripts/setup-e2e-backend.sh [app-url]   (default http://localhost:3000)
# Then keep it running with `CONVEX_AGENT_MODE=anonymous npx convex dev`.
# Don't run this in a checkout whose .env.local points at a cloud deployment.
set -euo pipefail
cd "$(dirname "$0")/.."
export CONVEX_AGENT_MODE=anonymous

app_url="${1:-http://localhost:3000}"
npx convex dev --once
bun scripts/set-auth-keys.ts "$app_url"
npx convex env set EMAIL_DELIVERY outbox
bun scripts/link-app-env.ts
