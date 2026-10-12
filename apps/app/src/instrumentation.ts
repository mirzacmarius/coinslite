import { sentryOptions } from "@/lib/sentry";
import * as Sentry from "@sentry/nextjs";

/** The server and edge runtimes report to Sentry like the browser does. */
export function register() {
  Sentry.init(sentryOptions);
}

// Errors from Server Components, route handlers and the proxy.
export const onRequestError = Sentry.captureRequestError;
