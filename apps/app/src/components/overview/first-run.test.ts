import { describe, expect, test } from "bun:test";
import { isFirstRun } from "./first-run";

describe("isFirstRun", () => {
  test("isn't known while the latest Items load", () => {
    expect(isFirstRun(undefined, undefined)).toBeUndefined();
    expect(isFirstRun(undefined, 0)).toBeUndefined();
  });

  test("a Collection with Items isn't a first run, whatever was sold", () => {
    expect(isFirstRun(3, undefined)).toBe(false);
    expect(isFirstRun(1, 0)).toBe(false);
  });

  test("with nothing owned, waits for the sold totals", () => {
    expect(isFirstRun(0, undefined)).toBeUndefined();
  });

  test("nothing owned and nothing sold is a first run", () => {
    expect(isFirstRun(0, 0)).toBe(true);
  });

  test("someone who has sold everything isn't starting over", () => {
    expect(isFirstRun(0, 2)).toBe(false);
  });
});
