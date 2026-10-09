#!/usr/bin/env bash
# Vercel build for the product app: deploys the Convex backend (production, or one
# preview deployment per branch), then builds the app against that deployment.
#
# Every preview build then loads the bundled Catalog datasets into the branch's
# preview deployment (catalog/seed:load). Loading again only updates what
# changed and rebuilds the datasets' search words, so a preview created before a
# dataset or search change catches up on its next build; `convex deploy
# --preview-run` would only reach a preview the first time it's created.
# Production stays unseeded until someone runs the seed there by hand.
set -euo pipefail
cd "$(dirname "$0")/.."

npx convex deploy \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL \
  --cmd 'bash scripts/build-app-for-deployment.sh'

if [ "${VERCEL_ENV:-}" = "preview" ] && [ -n "${VERCEL_GIT_COMMIT_REF:-}" ]; then
  # `convex deploy` names a Vercel preview deployment after its Git branch, and
  # the preview deploy key in CONVEX_DEPLOY_KEY lets `convex run` reach it.
  npx convex run --preview-name "$VERCEL_GIT_COMMIT_REF" \
    --typecheck disable --codegen disable \
    catalog/seed:load
fi
