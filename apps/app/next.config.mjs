import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Each route is prerendered into a static shell, and a link prefetches one
  // shell per route, so navigations are instant. See docs/adr/0004.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // In development, report every navigation that would wait on the server.
    // Pinned: the framework may make a stricter level the default later.
    instantInsights: { validationLevel: "warning" },
  },
};

export default nextConfig;
