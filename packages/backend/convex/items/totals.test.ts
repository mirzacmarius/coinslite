import { describe, expect, test } from "bun:test";
import { acquiredAt, monthOf } from "./totals";

/** Oslo in winter: an hour ahead of UTC. */
const OSLO = 60;

describe("the month an Item was acquired", () => {
  test("is its purchase month when it was bought before it was recorded", () => {
    const recorded = Date.parse("2026-10-12T09:00:00Z");
    expect(monthOf(acquiredAt(recorded, "2024-03-15", OSLO), OSLO)).toBe(
      "2024-03",
    );
  });

  test("is the month it was recorded when it has no purchase date", () => {
    const recorded = Date.parse("2026-10-12T09:00:00Z");
    expect(monthOf(acquiredAt(recorded, undefined, OSLO), OSLO)).toBe(
      "2026-10",
    );
  });

  test("is the month it was recorded when its purchase date is later", () => {
    const recorded = Date.parse("2026-01-31T12:00:00Z");
    expect(monthOf(acquiredAt(recorded, "2026-03-10", OSLO), OSLO)).toBe(
      "2026-01",
    );
  });

  test("keeps a purchase on the 1st in its month in any time zone", () => {
    const recorded = Date.parse("2026-10-12T09:00:00Z");
    // New York, five hours behind UTC, and Kiribati, fourteen ahead.
    expect(monthOf(acquiredAt(recorded, "2024-03-01", -300), -300)).toBe(
      "2024-03",
    );
    expect(monthOf(acquiredAt(recorded, "2024-03-01", 840), 840)).toBe(
      "2024-03",
    );
  });

  test("is January 1900 at the earliest, whatever the purchase date says", () => {
    const recorded = Date.parse("2026-10-12T09:00:00Z");
    // A purchase date mistyped as the year 202.
    expect(monthOf(acquiredAt(recorded, "0202-05-01", OSLO), OSLO)).toBe(
      "1900-01",
    );
  });

  test("starts at midnight of the purchase date in the person's time zone", () => {
    // Recorded at 00:30 on 1 October in Oslo, bought that same day.
    const recorded = Date.parse("2026-09-30T23:30:00Z");
    expect(acquiredAt(recorded, "2026-10-01", OSLO)).toBe(
      Date.parse("2026-09-30T23:00:00Z"),
    );
  });
});
