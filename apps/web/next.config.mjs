/**
 * Security headers on every response (COIN-169), as
 * apps/app/next.config.mjs sends but for the camera. No other site may
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
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // HTTPS only, for two years. Not for subdomains: email services may use
  // them for links.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Each route is prerendered into a static shell, and a link prefetches one
  // shell per route, so navigations are instant. See docs/adr/0004.
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
