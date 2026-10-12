import { describe, expect, test } from "bun:test";
import { isSet } from "./setRules";

describe("isSet, from a grouping's stored entry count", () => {
  test("a grouping with no entries is not a Set", () => {
    expect(isSet(0)).toBe(false);
  });

  test("one entry is not a Set", () => {
    expect(isSet(1)).toBe(false);
  });

  test("two entries make a Set", () => {
    expect(isSet(2)).toBe(true);
  });

  test("1,000 entries, the most a Set may have, still make a Set", () => {
    expect(isSet(1000)).toBe(true);
  });

  test("1,001 entries are too many to view as one Set", () => {
    expect(isSet(1001)).toBe(false);
  });
});
