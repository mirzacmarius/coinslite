import { defineConfig, devices } from "@playwright/test";
import {
  appPort,
  appUrl,
  backendDir,
  hasLocalBackend,
  isRemote,
  webPort,
  webUrl,
} from "./urls";

const isCI = !!process.env.CI;

// Smoke journeys prove the wiring of the running apps; rules are tested at the
// Convex function seam in the backend package.
export default defineConfig({
  testDir: "./tests",
  // The bundled Catalog, loaded once for every journey that needs it.
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["list"]] : "list",
  // CI's dev servers compile each page on its first visit.
  expect: { timeout: isCI ? 15_000 : 5_000 },
  use: {
    trace: "retain-on-failure",
    // Lets the suite through Vercel's deployment protection on previews.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass":
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: isRemote
    ? undefined
    : [
        {
          command: `bunx next dev -p ${appPort}`,
          cwd: "../../apps/app",
          // A deployment id, so open tabs can tell when a newer one is live.
          env: { NEXT_PUBLIC_WEB_URL: webUrl, NEXT_DEPLOYMENT_ID: "e2e" },
          url: appUrl,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
        {
          command: `bunx next dev -p ${webPort}`,
          cwd: "../../apps/web",
          env: { NEXT_PUBLIC_APP_URL: appUrl },
          url: webUrl,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
        ...(hasLocalBackend
          ? [
              {
                command: "npx convex dev --tail-logs disable",
                cwd: backendDir,
                env: { CONVEX_AGENT_MODE: "anonymous" },
                url: "http://127.0.0.1:3210/version",
                reuseExistingServer: !isCI,
                timeout: 120_000,
              },
            ]
          : []),
      ],
});
