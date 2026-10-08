#!/usr/bin/env bash
# Vercel build for the product app: deploys the Convex backend (production, or one
# preview deployment per branch), then builds the app against that deployment.
set -euo pipefail
cd "$(dirname "$0")/.."

npx convex deploy \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL \
  --cmd 'bash scripts/build-app-for-deployment.sh'
