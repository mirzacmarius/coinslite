import { defineConfig, devices } from "@playwright/test";
import { appUrl, webUrl } from "./urls";

const isCI = !!process.env.CI;

// Smoke journeys prove the wiring of the running apps; rules are tested at the
// Convex function seam in the backend package.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["list"]] : "list",
  use: {
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
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
  ],
});
