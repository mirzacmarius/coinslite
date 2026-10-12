import { describe, expect, test } from "bun:test";
import { planGradeUndo, planMoveUndo } from "./bulkRules";

describe("planMoveUndo", () => {
  test("Items still in the Album they were moved to go back to their own Albums, or to none", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "sweden" },
          { itemId: "stamp" },
        ],
        done: { albumId: "favourites" },
        now: new Map([
          ["coin", { albumId: "favourites" }],
          ["note", { albumId: "favourites" }],
          ["stamp", { albumId: "favourites" }],
        ]),
        albums: new Set(["norway", "sweden"]),
      }),
    ).toEqual({
      restore: [
        { itemId: "coin", albumId: "norway" },
        { itemId: "note", albumId: "sweden" },
        { itemId: "stamp", albumId: undefined },
      ],
      skipped: 0,
    });
  });

  test("Items moved again since, or taken out, are skipped and counted", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "sweden" },
          { itemId: "stamp", albumId: "norway" },
        ],
        done: { albumId: "favourites" },
        now: new Map([
          ["coin", { albumId: "favourites" }],
          ["note", { albumId: "denmark" }],
          ["stamp", {}],
        ]),
        albums: new Set(["norway", "sweden"]),
      }),
    ).toEqual({
      restore: [{ itemId: "coin", albumId: "norway" }],
      skipped: 2,
    });
  });

  test("Items deleted since being taken out of their Albums are skipped and counted", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "sweden" },
        ],
        done: {},
        now: new Map([["coin", {}]]),
        albums: new Set(["norway", "sweden"]),
      }),
    ).toEqual({
      restore: [{ itemId: "coin", albumId: "norway" }],
      skipped: 1,
    });
  });

  test("Items whose Album has been deleted since are skipped and counted", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "sweden" },
          { itemId: "stamp" },
        ],
        done: { albumId: "favourites" },
        now: new Map([
          ["coin", { albumId: "favourites" }],
          ["note", { albumId: "favourites" }],
          ["stamp", { albumId: "favourites" }],
        ]),
        albums: new Set(["norway"]),
      }),
    ).toEqual({
      restore: [
        { itemId: "coin", albumId: "norway" },
        { itemId: "stamp", albumId: undefined },
      ],
      skipped: 1,
    });
  });

  test("Items already in the Album the move was to are neither restored nor skipped", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "favourites" },
          { itemId: "stamp", albumId: "favourites" },
        ],
        done: { albumId: "favourites" },
        now: new Map([
          ["coin", { albumId: "favourites" }],
          ["note", { albumId: "favourites" }],
          ["stamp", { albumId: "sweden" }],
        ]),
        albums: new Set(["norway", "favourites"]),
      }),
    ).toEqual({
      restore: [{ itemId: "coin", albumId: "norway" }],
      skipped: 0,
    });
  });

  test("An Item listed twice goes back once, to the Album first given", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "coin", albumId: "sweden" },
        ],
        done: { albumId: "favourites" },
        now: new Map([["coin", { albumId: "favourites" }]]),
        albums: new Set(["norway", "sweden"]),
      }),
    ).toEqual({
      restore: [{ itemId: "coin", albumId: "norway" }],
      skipped: 0,
    });
  });
});

describe("planGradeUndo", () => {
  test("Items still with the Grade that was set get their own Grade and scale back, or none", () => {
    expect(
      planGradeUndo({
        before: [
          { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
          { itemId: "dime", gradingScale: "sheldon", grade: "63" },
          { itemId: "penny" },
        ],
        done: { gradingScale: "european", grade: "VF" },
        now: new Map([
          ["krone", { gradingScale: "european", grade: "VF" }],
          ["dime", { gradingScale: "european", grade: "VF" }],
          ["penny", { gradingScale: "european", grade: "VF" }],
        ]),
      }),
    ).toEqual({
      restore: [
        { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
        { itemId: "dime", gradingScale: "sheldon", grade: "63" },
        { itemId: "penny", gradingScale: undefined, grade: undefined },
      ],
      skipped: 0,
    });
  });

  test("Items regraded or deleted since are skipped and counted", () => {
    expect(
      planGradeUndo({
        before: [
          { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
          { itemId: "dollar", gradingScale: "international", grade: "VF" },
          { itemId: "note", gradingScale: "international", grade: "XF" },
          { itemId: "penny" },
        ],
        done: { gradingScale: "european", grade: "UNC" },
        now: new Map([
          ["krone", { gradingScale: "european", grade: "UNC" }],
          ["dollar", { gradingScale: "european", grade: "XF" }],
          ["note", { gradingScale: "international", grade: "UNC" }],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: "norwegian", grade: "1+" }],
      skipped: 3,
    });
  });

  test("Items that already had the Grade set are neither restored nor skipped", () => {
    expect(
      planGradeUndo({
        before: [
          { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
          { itemId: "ore", gradingScale: "norwegian", grade: "01" },
          { itemId: "dime", gradingScale: "norwegian", grade: "01" },
        ],
        done: { gradingScale: "norwegian", grade: "01" },
        now: new Map([
          ["krone", { gradingScale: "norwegian", grade: "01" }],
          ["ore", { gradingScale: "norwegian", grade: "01" }],
          ["dime", { gradingScale: "norwegian", grade: "2" }],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: "norwegian", grade: "1+" }],
      skipped: 0,
    });
  });

  test("An Item listed twice gets the Grade first given back, once", () => {
    expect(
      planGradeUndo({
        before: [
          { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
          { itemId: "krone", gradingScale: "norwegian", grade: "3" },
        ],
        done: { gradingScale: "european", grade: "VF" },
        now: new Map([["krone", { gradingScale: "european", grade: "VF" }]]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: "norwegian", grade: "1+" }],
      skipped: 0,
    });
  });
});
