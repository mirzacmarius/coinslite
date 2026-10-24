import { describe, expect, test } from "bun:test";
import {
  planGradeUndo,
  planMoveUndo,
  planPurchaseUndo,
  planTagUndo,
  purchasePatch,
} from "./bulkRules";

describe("planMoveUndo", () => {
  test("Items still in the Album they were moved to go back to their own Albums, or to none", () => {
    expect(
      planMoveUndo({
        before: [
          { itemId: "coin", albumId: "norway" },
          { itemId: "note", albumId: "sweden" },
          { itemId: "stamp" },
        ],
        after: { albumId: "favourites" },
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
        after: { albumId: "favourites" },
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
        after: {},
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
        after: { albumId: "favourites" },
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
        after: { albumId: "favourites" },
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
        after: { albumId: "favourites" },
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
        after: { gradingScale: "european", grade: "VF" },
        now: new Map([
          ["krone", { type: "coin", gradingScale: "european", grade: "VF" }],
          ["dime", { type: "coin", gradingScale: "european", grade: "VF" }],
          ["penny", { type: "coin", gradingScale: "european", grade: "VF" }],
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
        after: { gradingScale: "european", grade: "UNC" },
        now: new Map([
          ["krone", { type: "coin", gradingScale: "european", grade: "UNC" }],
          ["dollar", { type: "coin", gradingScale: "european", grade: "XF" }],
          [
            "note",
            { type: "banknote", gradingScale: "international", grade: "UNC" },
          ],
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
        after: { gradingScale: "norwegian", grade: "01" },
        now: new Map([
          ["krone", { type: "coin", gradingScale: "norwegian", grade: "01" }],
          ["ore", { type: "coin", gradingScale: "norwegian", grade: "01" }],
          ["dime", { type: "coin", gradingScale: "norwegian", grade: "2" }],
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
        after: { gradingScale: "european", grade: "VF" },
        now: new Map([
          ["krone", { type: "coin", gradingScale: "european", grade: "VF" }],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: "norwegian", grade: "1+" }],
      skipped: 0,
    });
  });

  test("Items whose own Grade no longer suits their Item type are skipped and counted", () => {
    expect(
      planGradeUndo({
        before: [
          { itemId: "krone", gradingScale: "norwegian", grade: "1+" },
          { itemId: "dime", gradingScale: "sheldon", grade: "63" },
        ],
        after: { gradingScale: "norwegian", grade: "01" },
        now: new Map([
          [
            "krone",
            { type: "banknote", gradingScale: "norwegian", grade: "01" },
          ],
          [
            "dime",
            { type: "banknote", gradingScale: "norwegian", grade: "01" },
          ],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: "norwegian", grade: "1+" }],
      skipped: 1,
    });
  });

  test("A Grading scale without a Grade comes back as no Grade", () => {
    expect(
      planGradeUndo({
        before: [{ itemId: "krone", gradingScale: "norwegian" }],
        after: { gradingScale: "european", grade: "VF" },
        now: new Map([
          ["krone", { type: "coin", gradingScale: "european", grade: "VF" }],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", gradingScale: undefined, grade: undefined }],
      skipped: 0,
    });
  });
});

describe("purchasePatch", () => {
  const today = "2026-10-12";

  test("writes only the fields filled in; empty ones leave each Item's own alone", () => {
    expect(
      purchasePatch(
        { purchasePrice: 12500, purchaseDate: "2026-09-30", source: "" },
        today,
      ),
    ).toStrictEqual({ purchasePrice: 12500, purchaseDate: "2026-09-30" });
  });

  test("keeps the source trimmed, and a Purchase price of 0 as a price", () => {
    expect(
      purchasePatch({ purchasePrice: 0, source: "  Oslo Myntgalleri " }, today),
    ).toStrictEqual({ purchasePrice: 0, source: "Oslo Myntgalleri" });
  });

  test("refuses a Purchase price the Item form refuses", () => {
    expect(() => purchasePatch({ purchasePrice: -100 }, today)).toThrow(
      "INVALID_AMOUNT",
    );
    expect(() => purchasePatch({ purchasePrice: 12.5 }, today)).toThrow(
      "INVALID_AMOUNT",
    );
    expect(() =>
      purchasePatch({ purchasePrice: 10_000_000_000_001 }, today),
    ).toThrow("INVALID_AMOUNT");
  });

  test("refuses a purchase date after today or that doesn't exist", () => {
    expect(() => purchasePatch({ purchaseDate: "2026-10-13" }, today)).toThrow(
      "INVALID_DATE",
    );
    expect(() => purchasePatch({ purchaseDate: "2026-02-30" }, today)).toThrow(
      "INVALID_DATE",
    );
    expect(() => purchasePatch({ purchaseDate: "12.10.2026" }, today)).toThrow(
      "INVALID_DATE",
    );
  });

  test("refuses a source longer than the Item form allows", () => {
    expect(() => purchasePatch({ source: "x".repeat(201) }, today)).toThrow(
      "TOO_LONG",
    );
  });

  test("with nothing filled in, or only blanks, is refused", () => {
    expect(() => purchasePatch({}, today)).toThrow("EMPTY_PURCHASE");
    expect(() =>
      purchasePatch({ purchaseDate: " ", source: "   " }, today),
    ).toThrow("EMPTY_PURCHASE");
  });
});

describe("planPurchaseUndo", () => {
  test("Items still with the purchase set get back their own values for the fields set, or none", () => {
    expect(
      planPurchaseUndo({
        before: [
          {
            itemId: "krone",
            purchasePrice: 9900,
            purchaseDate: "2024-05-01",
            source: "Auction",
          },
          { itemId: "ore", source: "Flea market" },
        ],
        after: { purchasePrice: 12500, purchaseDate: "2026-09-30" },
        now: new Map([
          [
            "krone",
            {
              purchasePrice: 12500,
              purchaseDate: "2026-09-30",
              source: "Auction",
            },
          ],
          [
            "ore",
            {
              purchasePrice: 12500,
              purchaseDate: "2026-09-30",
              source: "Flea market",
            },
          ],
        ]),
        today: "2026-10-12",
      }),
    ).toStrictEqual({
      restore: [
        // A Purchase price comes back with the Item's purchase in another
        // currency, here none: that clears any the purchase set.
        {
          itemId: "krone",
          purchasePrice: 9900,
          purchaseDate: "2024-05-01",
          purchasePaid: undefined,
        },
        {
          itemId: "ore",
          purchasePrice: undefined,
          purchaseDate: undefined,
          purchasePaid: undefined,
        },
      ],
      skipped: 0,
    });
  });

  test("Items whose purchase changed since, or deleted since, are skipped and counted", () => {
    expect(
      planPurchaseUndo({
        before: [
          { itemId: "krone", purchasePrice: 9900 },
          { itemId: "ore", purchasePrice: 500 },
          { itemId: "dollar", purchasePrice: 2000 },
        ],
        after: { purchasePrice: 12500, source: "Oslo Myntgalleri" },
        now: new Map([
          ["krone", { purchasePrice: 12500, source: "Oslo Myntgalleri" }],
          ["ore", { purchasePrice: 11000, source: "Oslo Myntgalleri" }],
        ]),
        today: "2026-10-12",
      }),
    ).toStrictEqual({
      restore: [
        {
          itemId: "krone",
          purchasePrice: 9900,
          source: undefined,
          purchasePaid: undefined,
        },
      ],
      skipped: 2,
    });
  });

  test("Items that already had the purchase set are neither restored nor skipped", () => {
    expect(
      planPurchaseUndo({
        before: [
          { itemId: "krone", purchaseDate: "2024-05-01", source: "Auction" },
          { itemId: "ore", purchaseDate: "2026-09-30", source: "Auction" },
          { itemId: "dime", purchaseDate: "2026-09-30" },
        ],
        after: { purchaseDate: "2026-09-30" },
        now: new Map([
          ["krone", { purchaseDate: "2026-09-30", source: "Auction" }],
          ["ore", { purchaseDate: "2026-09-30", source: "Auction" }],
          ["dime", { purchaseDate: "2025-01-01" }],
        ]),
        today: "2026-10-12",
      }),
    ).toStrictEqual({
      restore: [{ itemId: "krone", purchaseDate: "2024-05-01" }],
      skipped: 0,
    });
  });

  test("Items whose own purchase the Item form wouldn't store as it is are skipped and counted", () => {
    expect(
      planPurchaseUndo({
        before: [
          { itemId: "krone", purchasePrice: 9900, source: "Auction" },
          { itemId: "ore", purchasePrice: -5, source: "Auction" },
          { itemId: "dime", purchasePrice: 500, source: "x".repeat(201) },
          { itemId: "dollar", purchasePrice: 500, source: " Auction " },
          { itemId: "penny", purchaseDate: "2026-10-13" },
        ],
        after: { purchasePrice: 12500, source: "Oslo Myntgalleri" },
        now: new Map(
          ["krone", "ore", "dime", "dollar", "penny"].map((itemId) => [
            itemId,
            { purchasePrice: 12500, source: "Oslo Myntgalleri" },
          ]),
        ),
        today: "2026-10-12",
      }),
    ).toStrictEqual({
      restore: [
        {
          itemId: "krone",
          purchasePrice: 9900,
          source: "Auction",
          purchasePaid: undefined,
        },
        // Only the fields set are put back, so only they are checked.
        {
          itemId: "penny",
          purchasePrice: undefined,
          source: undefined,
          purchasePaid: undefined,
        },
      ],
      skipped: 3,
    });
  });

  test("An Item listed twice gets the purchase first given back, once", () => {
    expect(
      planPurchaseUndo({
        before: [
          { itemId: "krone", source: "Auction" },
          { itemId: "krone", source: "Flea market" },
        ],
        after: { source: "Oslo Myntgalleri" },
        now: new Map([["krone", { source: "Oslo Myntgalleri" }]]),
        today: "2026-10-12",
      }),
    ).toStrictEqual({
      restore: [{ itemId: "krone", source: "Auction" }],
      skipped: 0,
    });
  });

  test("a Purchase price comes back with the purchase in another currency it had, or none", () => {
    const euros = {
      amount: 12_000,
      currency: "EUR" as const,
      rateDay: "2024-05-10",
    };
    const dollars = {
      amount: 15_000,
      currency: "USD" as const,
      rateDay: "2026-10-23",
    };
    expect(
      planPurchaseUndo({
        before: [
          { itemId: "krone", purchasePrice: 140_298, purchasePaid: euros },
          { itemId: "ore", purchasePrice: 9_900 },
          { itemId: "daler", purchasePrice: 160_000, purchasePaid: dollars },
        ],
        // Set at 160 000 paid in dollars: "daler" already had it.
        after: { purchasePrice: 160_000, purchasePaid: dollars },
        now: new Map([
          ["krone", { purchasePrice: 160_000, purchasePaid: dollars }],
          // Typed in kroner since: it no longer holds the purchase set.
          ["ore", { purchasePrice: 160_000 }],
          ["daler", { purchasePrice: 160_000, purchasePaid: dollars }],
        ]),
        today: "2026-10-24",
      }),
    ).toEqual({
      restore: [
        { itemId: "krone", purchasePrice: 140_298, purchasePaid: euros },
      ],
      skipped: 1,
    });
  });

  test("a purchase in another currency no Item may hold isn't put back", () => {
    const undo = (purchasePaid: {
      amount: number;
      currency: "EUR";
      rateDay: string;
    }) =>
      planPurchaseUndo({
        before: [{ itemId: "krone", purchasePrice: 140_298, purchasePaid }],
        after: { purchasePrice: 100 },
        now: new Map([["krone", { purchasePrice: 100 }]]),
        today: "2026-10-24",
      });
    const paid = {
      amount: 12_000,
      currency: "EUR" as const,
      rateDay: "2024-05-10",
    };
    expect(undo(paid).restore).toHaveLength(1);
    expect(undo({ ...paid, amount: 1e300 })).toEqual({
      restore: [],
      skipped: 1,
    });
    expect(undo({ ...paid, amount: -5 }).skipped).toBe(1);
    expect(undo({ ...paid, rateDay: "junk" }).skipped).toBe(1);
  });
});

describe("planTagUndo", () => {
  test("Items still as the tag left them get their own tags back, or none", () => {
    expect(
      planTagUndo({
        before: [{ itemId: "krone", tags: ["Inherited"] }, { itemId: "dime" }],
        tag: "For sale",
        remove: false,
        now: new Map([
          ["krone", { tags: ["Inherited", "For sale"] }],
          ["dime", { tags: ["For sale"] }],
        ]),
      }),
    ).toEqual({
      restore: [
        { itemId: "krone", tags: ["Inherited"] },
        { itemId: "dime", tags: undefined },
      ],
      skipped: 0,
    });
  });

  test("a tag taken off goes back where it was", () => {
    expect(
      planTagUndo({
        before: [{ itemId: "krone", tags: ["For sale", "Inherited"] }],
        tag: "For sale",
        remove: true,
        now: new Map([["krone", { tags: ["Inherited"] }]]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", tags: ["For sale", "Inherited"] }],
      skipped: 0,
    });
  });

  test("tags the rules wouldn't store are never written back", () => {
    expect(
      planTagUndo({
        before: [
          { itemId: "krone", tags: ["Inherited", "for sale", "FOR SALE"] },
          { itemId: "dime", tags: ["x".repeat(41), "For sale"] },
        ],
        tag: "For sale",
        remove: true,
        now: new Map([
          ["krone", { tags: ["Inherited"] }],
          ["dime", { tags: ["x".repeat(41)] }],
        ]),
      }),
    ).toEqual({ restore: [], skipped: 2 });
  });

  test("Items retagged or deleted since are skipped and counted, each Item once", () => {
    expect(
      planTagUndo({
        before: [
          { itemId: "krone", tags: ["Inherited"] },
          { itemId: "krone", tags: ["Other"] },
          { itemId: "dime" },
          { itemId: "penny" },
        ],
        tag: "For sale",
        remove: false,
        now: new Map([
          ["krone", { tags: ["Inherited", "For sale"] }],
          ["dime", { tags: ["For sale", "Graded"] }],
        ]),
      }),
    ).toEqual({
      restore: [{ itemId: "krone", tags: ["Inherited"] }],
      skipped: 2,
    });
  });
});
