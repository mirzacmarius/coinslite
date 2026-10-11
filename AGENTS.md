## Agent skills

### Issue tracker

Issues are tracked in Linear (team `COIN`, project CoinsLite), using the Linear MCP tools. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Working here

- Work in your own git worktree: another agent session may be using this checkout.
- Run end-to-end tests locally with `bun run test:e2e:local <spec>` while working (once per machine: `packages/backend/scripts/setup-e2e-backend.sh`). In a new worktree, before the first run, copy both `.env.local` files from a worktree that already uses the local test backend (`anonymous:anonymous-agent`, never the cloud deployment) and link its `packages/backend/.convex`.
- When a page behaves differently locally than in CI, reinstall with `rm -rf node_modules && bun install`: bun keeps stale nested packages after lockfile changes.

## Prelaunch verification policy

- Before a pull request with code changes merges, run `bun run verify`: the quick checks, the build and every browser journey on the local test backend, about 1.5 minutes. Put what it reported in the pull request (for example "verify: 89 passed, 1 skipped"). New or changed journeys also get `bun run verify <spec> --repeat-each=3`. Documentation or copy-only changes don't need it.
- CI runs the quick checks (lint, format, typecheck, build, backend tests) on every pull request push, and `main` only accepts a pull request whose `check` passed. Merge with `gh pr merge <n> --merge --auto`: it lands once `check` passes, and the head branch is deleted. The browser suite runs on CI only when started by hand, for example before a release: `gh workflow run e2e.yml --ref <branch>`. A newer push cancels the running check.
- Vercel deploys the product app from `main` only; pull requests get no preview. Check UI changes locally (screenshots at phone and desktop width, light and dark). After a merge, confirm the production deployment succeeded before saying a change is live.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
