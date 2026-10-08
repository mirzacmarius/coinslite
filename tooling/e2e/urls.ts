import { resolve } from "node:path";

// Smoke tests run against local dev servers by default. Set E2E_APP_URL and
// E2E_WEB_URL to run them against a deployment instead (e.g. a Vercel preview).
export const appUrl = process.env.E2E_APP_URL ?? "http://localhost:3000";
export const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3001";
export const isRemote = Boolean(process.env.E2E_APP_URL);

// Account journeys need a backend whose emails can be read: the anonymous local
// deployment from packages/backend/scripts/setup-e2e-backend.sh. Set
// E2E_LOCAL_BACKEND=1 once it's configured (CI does).
export const hasLocalBackend = Boolean(process.env.E2E_LOCAL_BACKEND);
export const backendDir =
  process.env.E2E_BACKEND_DIR ?? resolve(__dirname, "../../packages/backend");
