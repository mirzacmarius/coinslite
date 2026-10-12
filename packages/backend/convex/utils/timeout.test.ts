import { describe, expect, test } from "bun:test";
import { withTimeout } from "./timeout";

describe("withTimeout", () => {
  test("a request that never answers fails once the time is up", async () => {
    const hanging = () => new Promise<never>(() => {});
    const started = Date.now();
    await expect(withTimeout(hanging, 20, "too slow")).rejects.toThrow(
      "too slow",
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
  });

  test("an answer in time is passed on", async () => {
    expect(await withTimeout(async () => "prices", 1000, "too slow")).toBe(
      "prices",
    );
  });

  test("a failure in time is passed on as it is", async () => {
    const failing = async () => {
      throw new Error("provider down");
    };
    await expect(withTimeout(failing, 1000, "too slow")).rejects.toThrow(
      "provider down",
    );
  });

  test("the request is told to stop once the time is up", async () => {
    let seen: AbortSignal | undefined;
    const hanging = (signal: AbortSignal) => {
      seen = signal;
      return new Promise<never>(() => {});
    };
    await withTimeout(hanging, 10, "too slow").catch(() => undefined);
    expect(seen?.aborted).toBe(true);
  });
});
