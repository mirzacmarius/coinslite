import { describe, expect, test } from "bun:test";
import { heldItemLimit, heldOf, othersOf } from "./held";

/** `count` owned Items of one entry, each of `quantity` pieces. */
const items = (count: number, quantity = 1) =>
  Array.from({ length: count }, (_, i) => ({ _id: `item${i}`, quantity }));

describe("heldOf", () => {
  test("adds up the pieces of the Items owned", () => {
    expect(heldOf([{ quantity: 2 }, { quantity: 3 }])).toEqual({
      held: 5,
      heldMore: false,
    });
  });

  test("holding none is zero", () => {
    expect(heldOf([])).toEqual({ held: 0, heldMore: false });
  });

  test("past the limit, counts only the first 100 Items and says there are more", () => {
    expect(heldItemLimit).toBe(100);
    expect(heldOf(items(101, 2))).toEqual({ held: 200, heldMore: true });
  });
});

describe("othersOf", () => {
  test("counts the owned Items besides the one shown, whatever their Quantity", () => {
    expect(othersOf(items(3, 5), "item1")).toBe(2);
  });

  test("the only Item has no others", () => {
    expect(othersOf(items(1), "item0")).toBe(0);
  });

  test("counts no further than the limit", () => {
    expect(othersOf(items(101), "elsewhere")).toBe(100);
    expect(othersOf(items(101), "item0")).toBe(100);
  });
});
