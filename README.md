# CoinsLite

A web app where collectors record the coins, banknotes and stamps they own, organise them, and track what they paid and what they're worth.

- Product requirements: [`docs/functional-spec.md`](docs/functional-spec.md)
- Domain glossary: [`CONTEXT.md`](CONTEXT.md)
- Architecture decisions: [`docs/adr/`](docs/adr/)
- Issues: Linear, project CoinsLite (see [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md))

## Layout

| Path | What it is |
|---|---|
| `apps/app` | Product app (Next.js), port 3000 |
| `apps/web` | Marketing site (Next.js), port 3001 |
| `packages/backend` | Convex backend: schema, functions, auth, billing |
| `packages/ui` | Shared UI components (shadcn/Tailwind) |
| `packages/email` | Email templates (React Email), preview on port 3003 |
| `tooling/e2e` | Playwright smoke tests |
| `tooling/typescript` | Shared TypeScript config |

## Getting started

Requires [Bun](https://bun.sh).

```sh
bun install
bun run setup   # configures a Convex deployment and points the app at it
bun dev         # marketing site, product app, Convex and email preview
```

`bun run setup` asks you to log in to Convex, or to start without an account and run Convex locally. Agents and CI can skip the prompt with `CONVEX_AGENT_MODE=anonymous bun run setup`.

## Checks

```sh
bun run lint        # Biome + monorepo consistency
bun run typecheck
bun run test        # backend rules, through Convex functions (convex-test + Vitest)
bun run test:e2e    # Playwright smoke tests; starts both apps if they aren't running
```

The first Playwright run needs a browser: `bunx playwright install chromium`.

CI runs all four on every push and pull request.

## Deployments

- **Hosting:** Vercel, team orvibo. `coinslite` builds `apps/app` and `coinslite-web` builds `apps/web`. Every push gets a preview, and `main` deploys to production (`coinslite.vercel.app`, `coinslite-web.vercel.app`).
- **Backend:** Convex project `coinslite` (team museumlite).
  - Production deploys use the production deploy key.
  - Each preview branch gets its own preview deployment, through the preview deploy key. Both keys are stored as `CONVEX_DEPLOY_KEY` in Vercel.
- **Preview settings:** previews take their sign-in keys from the Convex project's default preview variables. The build sets each preview's `SITE_URL` to its branch URL (`packages/backend/scripts/vercel-build-app.sh`).
- **New deployment's sign-in keys:** `bun scripts/set-auth-keys.ts <app-url> [--prod]` in `packages/backend`.
- **Smoke tests against a deployment:** set `E2E_APP_URL` and `E2E_WEB_URL`, plus `VERCEL_AUTOMATION_BYPASS_SECRET` if deployment protection is on, then run `bun run test:e2e`.
