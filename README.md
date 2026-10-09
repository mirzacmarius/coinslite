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

The account journeys (sign-up, verification, sign-in, password reset) need a backend whose emails can be read. They skip themselves unless `E2E_LOCAL_BACKEND=1`. To run them locally, use a separate checkout, because the setup script points that checkout at an anonymous local Convex deployment:

```sh
bash packages/backend/scripts/setup-e2e-backend.sh   # emails land in the dev outbox
E2E_LOCAL_BACKEND=1 bun run test:e2e                 # also starts the local backend
```

CI runs all four on every push and pull request.

## Deployments

- **Hosting:** Vercel, team orvibo. `coinslite` builds `apps/app` and `coinslite-web` builds `apps/web`. Every push gets a preview, and `main` deploys to production (`coinslite.vercel.app`, `coinslite-web.vercel.app`).
- **Backend:** Convex project `coinslite` (team museumlite).
  - Production deploys use the production deploy key.
  - Each preview branch gets its own preview deployment, through the preview deploy key. Both keys are stored as `CONVEX_DEPLOY_KEY` in Vercel.
- **Preview settings:** previews take their sign-in keys from the Convex project's default preview variables. The build sets each preview's `SITE_URL` to its branch URL (`packages/backend/scripts/vercel-build-app.sh`).
- **New deployment's sign-in keys:** `bun scripts/set-auth-keys.ts <app-url> [--prod]` in `packages/backend`.
- **Links between the sites:** the app's `NEXT_PUBLIC_WEB_URL` (privacy policy, terms) and the marketing site's `NEXT_PUBLIC_APP_URL` point at each other's production URL, previews included.
- **Signed-in visitors skip the marketing site** once both sites share a parent domain. Set `SIGNED_IN_HINT_DOMAIN` (for example `.coinslite.app`) on the app. On `*.vercel.app` the two sites can't share cookies.
- **Email:** sign-up and reset codes go out through Resend (`RESEND_API_KEY`, sender `RESEND_SENDER_EMAIL_AUTH`). Until a sending domain is verified, Resend only delivers to the account owner's address. `EMAIL_DELIVERY=outbox` stores emails instead of sending them; only local and CI test backends use it.
- **Smoke tests against a deployment:** set `E2E_APP_URL` and `E2E_WEB_URL`, plus `VERCEL_AUTOMATION_BYPASS_SECRET` if deployment protection is on, then run `bun run test:e2e`.
