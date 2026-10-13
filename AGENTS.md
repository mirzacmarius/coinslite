## Agent skills

### Issue tracker

Issues are tracked in Linear (team `COIN`, project CoinsLite), using the Linear MCP tools. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Working here

- Work in your own git worktree: another agent session may be using this checkout.
- When a page behaves differently locally than in CI, reinstall with `rm -rf node_modules && bun install`: bun keeps stale nested packages after lockfile changes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend, in `packages/backend`.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

<!-- convex-ai-end -->
