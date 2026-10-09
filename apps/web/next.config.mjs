/** @type {import('next').NextConfig} */
const nextConfig = {
  // Each route is prerendered into a static shell, and a link prefetches one
  // shell per route, so navigations are instant. See docs/adr/0004.
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
