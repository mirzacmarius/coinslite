#!/usr/bin/env bash
# The gate before a pull request merges: format, lint, typecheck, tests and
# the production build.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n== %s\n' "$1"; }

step "Format"
bun run format:check
step "Lint"
bun run lint
step "Typecheck"
bun run typecheck
step "Backend and app tests"
bun run test
step "Build"
# A route that can't produce its static shell only fails at build time.
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 \
  bun run build --filter=@coinslite/app --filter=@coinslite/web
