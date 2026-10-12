import { describe, expect, test } from "bun:test";
import { tooLargeToConvert } from "./rules";

/** History points as read: `valued` with a Market value, then `unvalued` without one. */
const points = (valued: number, unvalued: number) => [
  ...Array.from({ length: valued }, () => ({ marketValue: 1250 })),
  ...Array.from({ length: unvalued }, () => ({})),
];

/** Items as read; the rule only counts them. */
const items = (count: number) => Array.from({ length: count }, () => ({}));

describe("tooLargeToConvert", () => {
  test("history read past 5,000 points is too large, though some have no Market value", () => {
    expect(tooLargeToConvert({ items: [], history: points(5000, 1) })).toBe(
      true,
    );
  });

  test("history read past 5,000 points is too large when none has a Market value", () => {
    expect(tooLargeToConvert({ items: [], history: points(0, 5001) })).toBe(
      true,
    );
  });

  test("5,000 history points fit, with or without Market values", () => {
    expect(
      tooLargeToConvert({ items: items(5000), history: points(4000, 1000) }),
    ).toBe(false);
  });

  test("Items read past 5,000 are too large", () => {
    expect(tooLargeToConvert({ items: items(5001), history: [] })).toBe(true);
  });
});
