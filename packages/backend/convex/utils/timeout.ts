/**
 * Runs `work`, failing with `message` if it hasn't finished within `ms`.
 * `work` gets a signal that aborts when the time is up, for fetch to cancel
 * the request where the runtime supports it; the time limit holds either
 * way, so a request that never answers can't keep an action waiting.
 */
export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Rejected first, so the race ends with `message` rather than with
      // whatever `work` fails with once it's aborted.
      reject(new Error(message));
      controller.abort();
    }, ms);
  });
  try {
    return await Promise.race([work(controller.signal), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
