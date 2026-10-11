## Agent skills

### Issue tracker

Issues are tracked in Linear (team `COIN`, project CoinsLite), using the Linear MCP tools. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Working here

- Work in your own git worktree: another agent session may be using this checkout.
- Run end-to-end tests locally with `bun run test:e2e:local <spec>` (once per machine: `packages/backend/scripts/setup-e2e-backend.sh`).
- When a page behaves differently locally than in CI, reinstall with `rm -rf node_modules && bun install`: bun keeps stale nested packages after lockfile changes.

## Prelaunch verification policy

- Match local checks to the changed area. Documentation or copy-only changes do not need the full suite.
- For auth, permissions, billing, schema, or shared dependencies, run the relevant targeted tests and build checks.
- CI runs the quick checks (lint, format, typecheck, build, backend tests) on every pull request push, and the browser suite, split across 2 machines, once the pull request is not a draft. Docs-only changes start no run, and a newer push cancels the running one. Keep a pull request in draft while iterating to save Actions minutes.
- Run everything by hand when needed: `gh workflow run check.yml --ref <branch>`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
