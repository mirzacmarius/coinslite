# Build on the Convex v1 template

CoinsLite is built from the Convex v1 template: a Bun/Turborepo monorepo with Next.js apps, Convex for database, functions, storage and scheduled jobs, Convex Auth for sign-in, Polar for billing and Resend for email. We chose v1 because it gives us one TypeScript codebase with reactive queries and server-side functions, with access rules enforced in code on the server. Convex's scheduled jobs cover recurring work such as refreshing spot prices and exchange rates. Polar acts as merchant of record, so it handles VAT as CoinsLite launches country by country.

## Consequences

- Billing, the customer portal and subscription webhooks are built against Polar.
- Sentry and OpenPanel, which ship with v1, were removed rather than left unconfigured; add them back when monitoring and analytics are needed.
