import { withSentryConfig } from "@sentry/nextjs/config";
import "./src/env.mjs";

const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID || process.env.VERCEL_DEPLOYMENT_ID || "";

/**
 * Security headers on every response (COIN-169), as
 * apps/web/next.config.mjs sends but for the camera. No other site may
 * show these pages in a frame, so none can trick someone into clicking on
 * them (clickjacking). There's no script-source policy: prerendered pages carry
 * Next.js's inline scripts, which only nonces (each page rendered per
 * request, against docs/adr/0004) or 'unsafe-inline' let through.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  // frame-ancestors, for browsers from before it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The scanner's camera is the one device feature the app uses.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  // HTTPS only, for two years. Not for subdomains: email services may use
  // them for links.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Which deployment this build is. Next.js reloads on a mismatch when it
  // navigates; open tabs compare it with /api/version (components/
  // new-deployment-reload.tsx). Vercel provides the id; locally there's none.
  deploymentId: deploymentId || undefined,
  env: { NEXT_PUBLIC_DEPLOYMENT_ID: deploymentId },
  // Each route is prerendered into a static shell, and a link prefetches one
  // shell per route, so navigations are instant. See docs/adr/0004.
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // In development, report every navigation that would wait on the server.
    // Pinned: the framework may make a stricter level the default later.
    instantInsights: { validationLevel: "warning" },
  },
};

// Uploads source maps for readable stack traces when SENTRY_AUTH_TOKEN is set
// (Vercel Production), then deletes them so they aren't served.
export default withSentryConfig(nextConfig, {
  org: "museumlite",
  project: "coinslite",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
