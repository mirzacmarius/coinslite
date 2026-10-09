import { defineConfig, devices } from "@playwright/test";
import { appUrl, backendDir, hasLocalBackend, isRemote, webUrl } from "./urls";

const isCI = !!process.env.CI;

// Smoke journeys prove the wiring of the running apps; rules are tested at the
// Convex function seam in the backend package.
export default defineConfig({
  testDir: "./tests",
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
          command: "bun run dev",
          cwd: "../../apps/app",
          url: appUrl,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
        {
          command: "bun run dev",
          cwd: "../../apps/web",
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
