import { describe, expect, test } from "bun:test";
import { chargesAgain, isPremiumAt, premiumUntil } from "./rules";

// Midnight UTC on 20 October, 11 and 12 November 2026.
const oct20 = Date.UTC(2026, 9, 20);
const nov11 = Date.UTC(2026, 10, 11);
const nov12 = Date.UTC(2026, 10, 12);

describe("premiumUntil", () => {
  test("an active, trialing or past-due subscription is Premium until its period ends", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      expect(
        premiumUntil({
          status,
          currentPeriodEnd: nov12,
          cancelAtPeriodEnd: false,
        }),
      ).toBe(nov12);
    }
  });

  test("one with no period end known yet is Premium with no end", () => {
    expect(premiumUntil({ status: "active", cancelAtPeriodEnd: false })).toBe(
      "open",
    );
  });

  test("a cancelled one stays Premium until the end of the period paid for", () => {
    expect(
      premiumUntil({
        status: "canceled",
        currentPeriodEnd: nov12,
        cancelAtPeriodEnd: true,
      }),
    ).toBe(nov12);
    expect(
      premiumUntil({ status: "canceled", cancelAtPeriodEnd: true }),
    ).toBeNull();
  });

  test("one that has ended stops being Premium when it ended", () => {
    expect(
      premiumUntil({
        status: "canceled",
        currentPeriodEnd: nov12,
        cancelAtPeriodEnd: false,
        endedAt: oct20,
      }),
    ).toBe(oct20);
    expect(
      premiumUntil({
        status: "active",
        cancelAtPeriodEnd: false,
        endedAt: oct20,
      }),
    ).toBe(oct20);
    expect(
      premiumUntil({
        status: "active",
        currentPeriodEnd: nov11,
        cancelAtPeriodEnd: false,
        endedAt: nov12,
      }),
    ).toBe(nov11);
  });

  test("an unpaid or unfinished one is never Premium", () => {
    for (const status of ["unpaid", "incomplete", "incomplete_expired"]) {
      expect(
        premiumUntil({
          status,
          currentPeriodEnd: nov12,
          cancelAtPeriodEnd: false,
        }),
      ).toBeNull();
    }
  });
});

describe("chargesAgain", () => {
  test("a running subscription will be charged again, an unpaid one too", () => {
    for (const status of ["active", "trialing", "past_due", "unpaid"]) {
      expect(chargesAgain({ status, cancelAtPeriodEnd: false })).toBe(true);
    }
  });

  test("one set to cancel, cancelled or ended won't be", () => {
    expect(chargesAgain({ status: "active", cancelAtPeriodEnd: true })).toBe(
      false,
    );
    expect(chargesAgain({ status: "canceled", cancelAtPeriodEnd: false })).toBe(
      false,
    );
    expect(
      chargesAgain({
        status: "active",
        cancelAtPeriodEnd: false,
        endedAt: oct20,
      }),
    ).toBe(false);
    expect(
      chargesAgain({ status: "incomplete", cancelAtPeriodEnd: false }),
    ).toBe(false);
  });
});

describe("isPremiumAt", () => {
  test("Premium with no end is Premium at any time", () => {
    expect(isPremiumAt("open", nov12)).toBe(true);
  });

  test("Premium until a moment is Premium only before it", () => {
    expect(isPremiumAt(nov12, nov11)).toBe(true);
    expect(isPremiumAt(nov12, nov12)).toBe(false);
    expect(isPremiumAt(nov11, nov12)).toBe(false);
  });

  test("not Premium is never Premium", () => {
    expect(isPremiumAt(null, nov11)).toBe(false);
  });
});
