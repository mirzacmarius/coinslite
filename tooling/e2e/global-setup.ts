import { runInBackend } from "./support/accounts";
import { hasLocalBackend } from "./urls";

/** How often loading is tried, and how long to wait between tries. */
const attempts = 10;
const pauseMs = 3_000;

/**
 * Failures worth trying again: one dataset's import passing the local
 * backend's one-second limit on a busy runner, or the functions not pushed
 * yet when Playwright has only just started `convex dev`.
 */
const isPassing = (error: unknown) =>
  /timed out|Could not find function/.test(String(error));

/**
 * Loads the bundled Catalog once per run, after the web servers (including
 * the local backend) are up, so every Catalog journey finds it. Loading is
 * idempotent, so a passing failure is simply tried again.
 */
export default async function globalSetup() {
  if (!hasLocalBackend) return;
  for (let attempt = 1; ; attempt++) {
    try {
      runInBackend("catalog/seed:load", {});
      return;
    } catch (error) {
      if (!isPassing(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }
}
