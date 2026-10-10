import { runInBackend } from "./support/accounts";
import { hasLocalBackend } from "./urls";

/** Seed timeouts are retried this many times in all. */
const attempts = 3;

/**
 * Loads the bundled Catalog once per run, after the web servers (including
 * the local backend) are up, so every Catalog journey finds it. Loading is
 * idempotent; on a busy runner one dataset's import can pass the local
 * backend's one-second limit, so a timeout is tried again.
 */
export default async function globalSetup() {
  if (!hasLocalBackend) return;
  for (let attempt = 1; ; attempt++) {
    try {
      runInBackend("catalog/seed:load", {});
      return;
    } catch (error) {
      const timedOut = String(error).includes("timed out");
      if (!timedOut || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}
