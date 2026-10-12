import { describe, expect, test } from "bun:test";
import {
  type AttentionItem,
  combineNeedsAttention,
  needsAttention,
} from "./attention";

/** A coin with a Market value, a Grade and a photo: nothing to point out. */
const complete: AttentionItem = {
  type: "coin",
  marketValue: 120,
  grade: "XF",
  hasPhoto: true,
};

describe("what needs attention on a page of Items", () => {
  test("counts the owned Items without a Market value", () => {
    expect(
      needsAttention([
        complete,
        { ...complete, marketValue: undefined },
        { ...complete, type: "stamp", marketValue: undefined },
      ]),
    ).toEqual({ marketValue: 2, photo: 0, grade: 0 });
  });

  test("counts the owned Items without any photo", () => {
    expect(
      needsAttention([
        complete,
        { ...complete, hasPhoto: false },
        { ...complete, type: "banknote", hasPhoto: false },
        { ...complete, type: "stamp", hasPhoto: false },
      ]),
    ).toEqual({ marketValue: 0, photo: 3, grade: 0 });
  });

  test("counts the coins and banknotes without a Grade, but no stamps", () => {
    expect(
      needsAttention([
        complete,
        { ...complete, grade: undefined },
        { ...complete, type: "banknote", grade: undefined },
        { ...complete, type: "stamp", grade: undefined },
      ]),
    ).toEqual({ marketValue: 0, photo: 0, grade: 2 });
  });

  test("leaves out sold Items, whatever they lack", () => {
    expect(
      needsAttention([
        { ...complete, marketValue: undefined },
        {
          type: "coin",
          hasPhoto: false,
          soldOn: "2026-09-30",
        },
      ]),
    ).toEqual({ marketValue: 1, photo: 0, grade: 0 });
  });

  test("an Item lacking all three counts once under each", () => {
    expect(needsAttention([{ type: "banknote", hasPhoto: false }])).toEqual({
      marketValue: 1,
      photo: 1,
      grade: 1,
    });
  });
});

describe("what needs attention across the whole Collection", () => {
  test("adds up the pages' counts", () => {
    expect(
      combineNeedsAttention(
        { marketValue: 3, photo: 0, grade: 7 },
        { marketValue: 2, photo: 5, grade: 0 },
      ),
    ).toEqual({ marketValue: 5, photo: 5, grade: 7 });
  });

  test("pages counted one by one add up to the whole", () => {
    expect(
      [
        needsAttention([{ type: "coin", hasPhoto: false }]),
        needsAttention([{ type: "stamp", hasPhoto: true }]),
      ].reduce(combineNeedsAttention),
    ).toEqual({ marketValue: 2, photo: 1, grade: 1 });
  });
});
