import { describe, expect, test } from "bun:test";
import { isUnfinishedSignUp, stillDue } from "./deletionRules";

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

describe("isUnfinishedSignUp", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 9, 23);
  const signedUp = (daysAgo: number) => ({
    _creationTime: now - daysAgo * day,
  });

  test("a sign-up whose email nobody proved goes after a week", () => {
    expect(isUnfinishedSignUp(signedUp(8), now)).toBe(true);
    expect(isUnfinishedSignUp(signedUp(6), now)).toBe(false);
  });

  test("a proven email, a sign-in, a role or a deactivation keep the user", () => {
    const old = signedUp(30);
    expect(
      isUnfinishedSignUp({ ...old, emailVerificationTime: now - day }, now),
    ).toBe(false);
    expect(isUnfinishedSignUp({ ...old, lastSignInAt: now - day }, now)).toBe(
      false,
    );
    expect(isUnfinishedSignUp({ ...old, role: "admin" }, now)).toBe(false);
    expect(isUnfinishedSignUp({ ...old, deactivatedAt: now - day }, now)).toBe(
      false,
    );
  });
});
