import "./src/env.mjs";

const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID || process.env.VERCEL_DEPLOYMENT_ID || "";

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
  experimental: {
    // In development, report every navigation that would wait on the server.
    // Pinned: the framework may make a stricter level the default later.
    instantInsights: { validationLevel: "warning" },
  },
};

export default nextConfig;
