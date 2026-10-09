#!/usr/bin/env bash
# Configures an anonymous local Convex deployment for end-to-end tests: no
# Convex account needed, and emails land in the dev outbox instead of being sent.
# Usage: bash scripts/setup-e2e-backend.sh [app-url]   (default http://localhost:3000)
# Then keep it running with `CONVEX_AGENT_MODE=anonymous npx convex dev`.
# It refuses to run against anything but an anonymous local deployment: it
# replaces the deployment's sign-in keys and turns off real email.
set -euo pipefail
cd "$(dirname "$0")/.."
export CONVEX_AGENT_MODE=anonymous

if [[ -n "${CONVEX_DEPLOY_KEY:-}" ]]; then
  echo "CONVEX_DEPLOY_KEY is set; refusing to touch that deployment." >&2
  exit 1
fi
if [[ -f .env.local ]] && grep -q '^CONVEX_DEPLOYMENT=' .env.local &&
  ! grep -q '^CONVEX_DEPLOYMENT=anonymous:' .env.local; then
  echo "packages/backend/.env.local points at a Convex cloud deployment;" \
    "run this in a separate checkout (see README, Checks)." >&2
  exit 1
fi

app_url="${1:-http://localhost:3000}"
npx convex dev --once
bun scripts/set-auth-keys.ts "$app_url"
npx convex env set EMAIL_DELIVERY outbox
bun scripts/link-app-env.ts
