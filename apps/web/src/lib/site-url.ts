/**
 * This site's own address: its production domain on Vercel, which sets
 * VERCEL_PROJECT_PRODUCTION_URL at build time, else the local one.
 */
export const siteUrl = () => {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "http://localhost:3001";
};
