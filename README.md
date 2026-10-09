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

On such a test backend, `npx convex run testing/premium:grant '{"email":"…"}'` (in `packages/backend`) makes an account Premium without a payment; the Insurance report journey uses it. Any deployment that sends real email refuses it.

CI runs all four on every push and pull request.

## Deployments

- **Hosting:** Vercel, team orvibo. `coinslite` builds `apps/app` and `coinslite-web` builds `apps/web`. Every push gets a preview, and `main` deploys to production (`coinslite.vercel.app`, `coinslite-web.vercel.app`).
- **Backend:** Convex project `coinslite` (team museumlite).
  - Production deploys use the production deploy key.
  - Each preview branch gets its own preview deployment, through the preview deploy key. Both keys are stored as `CONVEX_DEPLOY_KEY` in Vercel.
- **Preview settings:** previews take their sign-in keys from the Convex project's default preview variables. The build sets each preview's `SITE_URL` to its branch URL (`packages/backend/scripts/vercel-build-app.sh`).
- **Catalog data:** every preview build loads the bundled Catalog datasets into the branch's preview deployment (`convex run catalog/seed:load` in the same script). Loading again only updates what changed and rebuilds the datasets' search words. Production stays empty until someone runs `npx convex run catalog/seed:load --prod` in `packages/backend`; Catalog nodes from other CSV imports get new search words with `catalog/search:reindex`. The 2-euro commemoratives come from the ECB's yearly lists: when the ECB adds coins, run `bun scripts/fetch-euro-commemoratives.ts` in `packages/backend`, review the diff and commit it.
- **New deployment's sign-in keys:** `bun scripts/set-auth-keys.ts <app-url> [--prod]` in `packages/backend`.
- **Links between the sites:** the app's `NEXT_PUBLIC_WEB_URL` (privacy policy, terms) and the marketing site's `NEXT_PUBLIC_APP_URL` point at each other's production URL, previews included.
- **Signed-in visitors skip the marketing site** once both sites share a parent domain. Set `SIGNED_IN_HINT_DOMAIN` (for example `.coinslite.app`) on the app. On `*.vercel.app` the two sites can't share cookies.
- **Google sign-in:** `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` on the Convex deployment. The OAuth client's redirect URIs cover the dev and prod `convex.site` domains only, so previews can't use Google.
- **Email:** sign-up, reset and sign-in-link emails go out through Resend (`RESEND_API_KEY`, sender `RESEND_SENDER_EMAIL_AUTH`). Until a sending domain is verified, Resend only delivers to the account owner's address. `EMAIL_DELIVERY=outbox` stores emails instead of sending them; only local and CI test backends use it.
- **Feedback:** messages sent from Account go to the team inbox in `FEEDBACK_EMAIL` on the Convex deployment, with replies going to the sender. Without it, each message is written to the deployment log instead.
- **Spot prices and exchange rates:** a cron fetches gold, silver and the Home currency rates from MetalpriceAPI every 15 minutes (`METALPRICE_API_KEY` on the Convex deployment). That's about 2,900 requests a month, more than the free tier allows. Without a key the refresh logs a warning, keeps the last stored prices, and a fresh deployment shows no Spot prices.
- **Billing:** Premium is sold through Polar, in its sandbox unless `POLAR_SERVER=production`. On the Convex deployment, set `POLAR_ORGANIZATION_TOKEN`, then run `npx convex run init` in `packages/backend` (`--prod` for production) once per Polar organization: it creates the Premium monthly and yearly products with their NOK, EUR, USD and RON prices and prints the `POLAR_PREMIUM_MONTHLY_PRODUCT_ID` and `POLAR_PREMIUM_YEARLY_PRODUCT_ID` values to set. Make EUR the organization's default currency in Polar. Point the organization's webhook (subscription events) at `https://<deployment>.convex.site/polar/events` and set its secret as `POLAR_WEBHOOK_SECRET`. Until all of this is set, the Plans page says Premium can't be bought on that deployment. Premium members change or cancel their subscription in Polar's customer portal, opened from Account: the organization token needs the `customer_sessions:write` scope (alongside checkouts, products and subscriptions), and Polar's Settings › Customer portal must allow subscription plan changes for members to switch between monthly and yearly there. The sandbox checkout smoke test runs with `E2E_POLAR_SANDBOX=1`.
- **Smoke tests against a deployment:** set `E2E_APP_URL` and `E2E_WEB_URL`, plus `VERCEL_AUTOMATION_BYPASS_SECRET` if deployment protection is on, then run `bun run test:e2e`.
