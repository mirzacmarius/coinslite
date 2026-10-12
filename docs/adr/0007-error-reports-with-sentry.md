# Error reports with Sentry

The product app reports its errors, and a sample of traces, to Sentry: organization `museumlite`, project `coinslite`, in Sentry's EU region. ADR 0002 removed the template's Sentry until monitoring was needed; this brings it back for apps/app only. The marketing site is static and has nothing worth monitoring yet, and the Convex backend logs to its own dashboard. `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel Production only, so local runs, CI and previews send nothing.

- **One setup for every runtime.** `apps/app/src/lib/sentry.ts` holds the options. `instrumentation-client.ts` uses them in the browser, `instrumentation.ts` on the server and the edge, and `onRequestError` and `global-error.tsx` catch what the app doesn't. Traces are sampled at 10% in production.
- **Reports say what broke, never who it happened to.** `dataCollection` turns off user details, cookies, headers, bodies, query strings and local variables. On top of that, the hooks strip query strings and hashes from every address in event URLs, transaction and span names, span attributes, breadcrumbs and exception messages, because in this app they carry sign-in codes, email-confirmation tokens and admin searches. The Sentry project is also set to discard IP addresses.
- **Readable production stack traces.** `withSentryConfig` uploads source maps during the Vercel build when `SENTRY_AUTH_TOKEN` is set, then deletes them so they aren't served.

## Considered options

- **Vercel's runtime logs alone.** They show server errors but nothing from the browser, and they don't group errors or keep them for long. Rejected.
- **The SDK's defaults.** In version 11 these include user details, request bodies and query strings, which would send sign-in codes and email addresses to Sentry. Rejected.
- **Session replay.** It would show what led up to an error, but it records the page, and the page is someone's Collection. Left off.

## Consequences

- The privacy policy names Sentry as a processor in every language.
- `SENTRY_AUTH_TOKEN` is a personal token, so the source map uploads depend on one account. Replace it with an organization token when someone else joins.
- Breadcrumbs from `console` calls are sent as written, so nothing personal should be logged in the app.
