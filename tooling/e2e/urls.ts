// Smoke tests run against local dev servers by default. Set E2E_APP_URL and
// E2E_WEB_URL to run them against a deployment instead (e.g. a Vercel preview).
export const appUrl = process.env.E2E_APP_URL ?? "http://localhost:3000";
export const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3001";
export const isRemote = Boolean(process.env.E2E_APP_URL);
