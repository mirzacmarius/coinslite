import { describe, expect, test } from "bun:test";
import { marketRates } from "../spotPrices/rates";
import {
  type CollectionTotals,
  type TotalsItem,
  acquiredAt,
  collectionTotals,
  combineTotals,
  monthOf,
  pageTotals,
  withMetalValues,
} from "./totals";

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

// Gold at $2,000 and silver at $25 a troy ounce (31.1034768 g), 10 NOK to
// the dollar: a troy ounce of gold is 20,000 kr and one of silver 250 kr.
const rates = marketRates({
  quotedAt: 0,
  fetchedAt: 0,
  checkedAt: 0,
  perDollar: {
    USD: 1,
    NOK: 10,
    SEK: 10.5,
    DKK: 6.9,
    EUR: 0.92,
    RON: 4.6,
    GBP: 0.79,
    CHF: 0.88,
    XAU: 1 / 2000,
    XAG: 1 / 25,
  },
});

// Amounts in øre.
const krugerrand: TotalsItem = {
  _creationTime: Date.UTC(2026, 0, 15, 12),
  type: "coin",
  quantity: 1,
  purchasePrice: 15_000_00,
  marketValue: 21_000_00,
  metal: "gold",
  weight: 31.1034768,
  purity: 1,
};
const silverCoins: TotalsItem = {
  // 23:30 on 31 January in UTC is already 1 February in Oslo.
  _creationTime: Date.UTC(2026, 0, 31, 23, 30),
  type: "coin",
  quantity: 2,
  purchasePrice: 300_00,
  metal: "silver",
  weight: 31.1034768,
  purity: 0.5,
};
const inheritedBanknote: TotalsItem = {
  _creationTime: Date.UTC(2026, 2, 10, 12),
  type: "banknote",
  quantity: 1,
  marketValue: 500_00,
};
const soldStamps: TotalsItem = {
  _creationTime: Date.UTC(2026, 2, 20, 12),
  type: "stamp",
  quantity: 3,
  purchasePrice: 10_00,
  marketValue: 12_00,
  salePrice: 20_00,
};

const context = { currency: "NOK", rates, utcOffsetMinutes: OSLO } as const;

const expectedTotals: CollectionTotals = {
  currency: "NOK",
  items: 4,
  pieces: { coin: 3, banknote: 1, stamp: 3 },
  purchasePrice: 15_630_00,
  marketValue: 21_536_00,
  gainLoss: { amount: 6_006_00, items: 2 },
  salePrice: 60_00,
  realised: { amount: 30_00, items: 1 },
  byType: {
    coin: { purchasePrice: 15_600_00, marketValue: 21_000_00 },
    banknote: { purchasePrice: 0, marketValue: 500_00 },
    stamp: { purchasePrice: 30_00, marketValue: 36_00 },
  },
  metals: {
    gold: { fineWeight: 31.1034768, value: 20_000_00 },
    silver: { fineWeight: 31.1034768, value: 250_00 },
  },
  addedByMonth: [
    { month: "2026-01", purchasePrice: 15_000_00, marketValue: 21_000_00 },
    { month: "2026-02", purchasePrice: 600_00, marketValue: 0 },
    { month: "2026-03", purchasePrice: 30_00, marketValue: 536_00 },
  ],
};

describe("Collection totals", () => {
  test("add up every Item's Purchase price, Market value, pieces and Metal value in one pass", () => {
    expect(
      collectionTotals(
        [krugerrand, silverCoins, inheritedBanknote, soldStamps],
        context,
      ),
    ).toEqual(expectedTotals);
  });

  test("combining any split of the same Items into pages gives the same totals as one page", () => {
    const spotPrices = {
      gold: rates.spotPricePerGram("gold", "NOK"),
      silver: rates.spotPricePerGram("silver", "NOK"),
    };
    const splits: TotalsItem[][][] = [
      [
        [krugerrand, inheritedBanknote],
        [silverCoins, soldStamps],
      ],
      [[krugerrand], [silverCoins, inheritedBanknote, soldStamps]],
      [[soldStamps], [inheritedBanknote], [silverCoins], [krugerrand]],
      [[], [krugerrand, silverCoins, inheritedBanknote, soldStamps], []],
    ];
    for (const pages of splits) {
      const combined = pages
        .map((page) => pageTotals(page, context))
        .reduce(combineTotals);
      expect(withMetalValues(combined, spotPrices)).toEqual(expectedTotals);
    }
  });

  test("work out each Item's Metal value at the Spot prices and add them up as each Item shows it", () => {
    // Silver at 1.003 kr (100.3 øre) a gram. Two Items of three 1 g pieces,
    // half silver, are worth 150.45 øre each, shown as 150; a 2 g piece of
    // pure silver is worth 200.6 øre, shown as 201. Together 501 øre, not the
    // 502 that the 5 g of fine silver would round to as one amount.
    const halfSilver: TotalsItem = {
      _creationTime: Date.UTC(2026, 0, 15, 12),
      type: "coin",
      quantity: 3,
      metal: "silver",
      weight: 1,
      purity: 0.5,
    };
    const pureSilver: TotalsItem = {
      ...halfSilver,
      quantity: 1,
      weight: 2,
      purity: 1,
    };
    const totals = withMetalValues(
      combineTotals(
        pageTotals([halfSilver], context),
        pageTotals([pureSilver, halfSilver], context),
      ),
      { gold: 60_000, silver: 100.3 },
    );

    expect(totals.metals).toEqual({
      gold: { fineWeight: 0, value: 0 },
      silver: { fineWeight: 5, value: 501 },
    });
  });

  test("the Metal value is null without Spot prices, while fine weight still counts", () => {
    const totals = withMetalValues(
      pageTotals([krugerrand, silverCoins], context),
      null,
    );

    expect(totals.metals).toEqual({
      gold: { fineWeight: 31.1034768, value: null },
      silver: { fineWeight: 31.1034768, value: null },
    });
  });
});
