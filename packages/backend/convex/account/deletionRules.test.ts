import { describe, expect, test } from "bun:test";
import { stillDue } from "./deletionRules";

const active = {};
const deactivated = { deactivatedAt: Date.UTC(2026, 9, 1) };

describe("stillDue", () => {
  test("the person's own request deletes a deactivated account only", () => {
    expect(stillDue(deactivated, undefined)).toBe(true);
    expect(stillDue(active, undefined)).toBe(false);
  });

  test("a deactivated account whose time is up goes, unless reactivated", () => {
    expect(stillDue(deactivated, "deactivated")).toBe(true);
    expect(stillDue(active, "deactivated")).toBe(false);
  });

  test("an unused account goes after its last notice, on Free, while active", () => {
    expect(stillDue({ inactivityNotice: 12 }, "unused")).toBe(true);
    // Signed in since: the count of months started again.
    expect(stillDue({}, "unused")).toBe(false);
    expect(stillDue({ inactivityNotice: 12, plan: "premium" }, "unused")).toBe(
      false,
    );
    expect(stillDue({ inactivityNotice: 12, ...deactivated }, "unused")).toBe(
      false,
    );
  });
});
