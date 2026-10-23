import { env } from "@/env.mjs";
import type { BrowserOptions, Event } from "@sentry/nextjs";

/**
 * Removes the query string and hash from every address in a text. In this app
 * they carry sign-in codes, email-confirmation tokens and admin searches.
 */
function withoutQueries(text: string) {
  return text.replace(/((?:https?:\/\/|\/)[^\s?#"']*)[?#][^\s"']*/g, "$1");
}

function scrubEvent<E extends Event>(event: E): E {
  if (event.request) {
    if (event.request.url)
      event.request.url = withoutQueries(event.request.url);
    event.request.query_string = undefined;
    event.request.cookies = undefined;
    event.request.headers = undefined;
  }
  if (event.transaction) event.transaction = withoutQueries(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = withoutQueries(exception.value);
  }
  return event;
}

/**
 * Error reports and a sample of traces to Sentry (org museumlite, project
 * coinslite, stored in Germany), shared by the browser, Node and edge
 * runtimes. Without NEXT_PUBLIC_SENTRY_DSN, as in local runs and CI, nothing
 * is sent. Reports say what broke, never who it happened to: no user, IP
 * address, cookies, headers, bodies, local variables or query strings.
 */
export const sentryOptions = {
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
  /**
   * Not sent: the browsers' own wording for a fetch that failed because the
   * person was offline or the connection dropped ("Load failed" is Safari's,
   * "Failed to fetch" Chrome's), most often Convex Auth refreshing its token
   * through /api/auth, which retries by itself; and Safari's wording for
   * parsing the empty reply such a refresh gets. Nothing in the app can act
   * on them, and they drowned the real errors.
   */
  ignoreErrors: [
    "Load failed",
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "The string did not match the expected pattern",
  ],
  /** Vercel's toolbar on preview deployments: its errors are its own. */
  denyUrls: [/\/_next-live\/feedback\//],
  beforeSend: scrubEvent,
  beforeSendSpan(span) {
    span.name = withoutQueries(span.name);
    for (const [key, value] of Object.entries(span.attributes)) {
      if (typeof value === "string" && /url|query|fragment|target/i.test(key)) {
        span.attributes[key] = withoutQueries(value);
      }
    }
    return span;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message) {
      breadcrumb.message = withoutQueries(breadcrumb.message);
    }
    for (const key of ["url", "from", "to"]) {
      const value = breadcrumb.data?.[key];
      if (typeof value === "string" && breadcrumb.data) {
        breadcrumb.data[key] = withoutQueries(value);
      }
    }
    return breadcrumb;
  },
} satisfies BrowserOptions;
