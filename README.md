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
```

CI runs lint and typecheck on every push.

## Deployments

- **Hosting:** Vercel, team orvibo. `coinslite` builds `apps/app` and `coinslite-web` builds `apps/web`. Every push gets a preview of the product app, and `main` deploys both to production (`coinslite.vercel.app`, `coinslite-web.vercel.app`). The marketing site deploys only from `main` (`apps/web/vercel.json`): the team's plan allows 100 deployments a day, and a second preview per push used them up.
- **Backend:** Convex project `coinslite` (team museumlite).
- **Links between the sites:** the app's `NEXT_PUBLIC_WEB_URL` (privacy policy, terms) and the marketing site's `NEXT_PUBLIC_APP_URL` point at each other's production URL, previews included.
- **Signed-in visitors skip the marketing site** once both sites share a parent domain. Set `SIGNED_IN_HINT_DOMAIN` (for example `.coinslite.app`) on the app. On `*.vercel.app` the two sites can't share cookies.
- **Google sign-in:** `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` on the Convex deployment. The OAuth client's redirect URIs cover the dev and prod `convex.site` domains only, so previews can't use Google.
- **Email:** sign-up, reset and sign-in-link emails go out through Resend (`RESEND_API_KEY`, sender `RESEND_SENDER_EMAIL_AUTH`). Until a sending domain is verified, Resend only delivers to the account owner's address. `EMAIL_DELIVERY=outbox` stores emails instead of sending them; only local and CI test backends use it.
- **Feedback:** messages sent from Account go to the team inbox in `FEEDBACK_EMAIL` on the Convex deployment, with replies going to the sender. Without it, each message is written to the deployment log instead.
- **Spot prices and exchange rates:** a cron fetches gold, silver and the Home currency rates from MetalpriceAPI every 15 minutes (`METALPRICE_API_KEY` on the Convex deployment). That's about 2,900 requests a month, more than the free tier allows. Without a key the refresh logs a warning, keeps the last stored prices, and a fresh deployment shows no Spot prices.
- **Photo links:** Item photos are served only through signed links that work for an hour at most (`https://<deployment>.convex.site/photos?…`), never as plain storage addresses. Set `PHOTO_LINK_SECRET` on each Convex deployment to a long random value (for example `openssl rand -hex 32`); without it the deployment signs with a random secret it keeps in its database, which works for local development and tests. Changing the secret only makes the links already open stop working until the app fetches fresh ones (within half an hour).
- **Error reports:** the product app reports errors, and a 10% sample of traces, to Sentry (org `museumlite`, project `coinslite`, EU region) when `NEXT_PUBLIC_SENTRY_DSN` is set, which it is on Vercel Production only (docs/adr/0007). Reports carry no user, IP address, cookies, headers, bodies or query strings (`apps/app/src/lib/sentry.ts`), and the Sentry project discards IP addresses. `SENTRY_AUTH_TOKEN` on the same Vercel project uploads source maps during the build, which are then deleted.
- **Usage statistics:** both sites count page views with OpenPanel, cookieless and without identifying anyone (docs/adr/0006). Each Vercel project has its own OpenPanel client in `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, set for Production only; without it nothing is sent, so local runs, CI and previews aren't counted. The client secret isn't needed.
- **Billing:** Premium is sold through Polar, in its sandbox unless `POLAR_SERVER=production`. On the Convex deployment, set `POLAR_ORGANIZATION_TOKEN`, then run `npx convex run init` in `packages/backend` (`--prod` for production) once per Polar organization: it creates the Premium monthly and yearly products with their NOK, EUR, USD and RON prices and prints the `POLAR_PREMIUM_MONTHLY_PRODUCT_ID` and `POLAR_PREMIUM_YEARLY_PRODUCT_ID` values to set. Make EUR the organization's default currency in Polar. Point the organization's webhook (subscription events) at `https://<deployment>.convex.site/polar/events` and set its secret as `POLAR_WEBHOOK_SECRET`. Until all of this is set, the Plans page says Premium can't be bought on that deployment. Premium members change or cancel their subscription in Polar's customer portal, opened from Account: the organization token needs the `customer_sessions:write` scope (alongside checkouts, products and subscriptions), and Polar's Settings › Customer portal must allow subscription plan changes for members to switch between monthly and yearly there. The sandbox checkout smoke test runs with `E2E_POLAR_SANDBOX=1`.