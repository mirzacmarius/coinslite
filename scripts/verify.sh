#!/usr/bin/env bash
# The gate before a pull request merges: everything CI's quick checks run,
# then every browser journey against the local test backend. About a minute
# and a half on a laptop. Arguments go to Playwright, e.g. a spec to run
# alone or --repeat-each=3 for new journeys.
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
# As in CI: a route that can't produce its static shell only fails here.
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 \
  bun run build --filter=@coinslite/app --filter=@coinslite/web
step "Browser journeys"
# One retry: in a new worktree the dev servers compile every page for the
# first time while 8 journeys wait on them, and the first few can run past
# 30 s. Playwright still lists any journey that needed it as flaky.
bun run test:e2e:local --retries=1 "$@"
