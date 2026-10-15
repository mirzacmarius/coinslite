import { describe, expect, test } from "bun:test";
import type { MarketRates } from "../spotPrices/rates";
import {
  type SeriesItem,
  combineValueOverTime,
  seriesMonths,
  startOf,
  valueOverTime,
} from "./valueOverTime";

/** Oslo in winter: an hour ahead of UTC. */
const OSLO = 60;

/** Recorded in CoinsLite on 12 October 2026. */
const RECORDED = Date.parse("2026-10-12T09:00:00Z");

/** A coin recorded on 12 October 2026, no metal, no history. */
const coin = (fields: Partial<SeriesItem>): SeriesItem => ({
  _creationTime: RECORDED,
  type: "coin",
  quantity: 1,
  history: [],
  ...fields,
});

/** Spot prices with gold at `perGram` minor units a gram. */
const goldAt = (perGram: number): MarketRates => ({
  quotedAt: 0,
  ratesQuotedAt: 0,
  stale: false,
  rate: () => 1,
  convert: (amount) => amount,
  spotPricePerGram: () => perGram,
});

/** The series in Oslo, NOK, without Spot prices. */
const seriesOf = (items: SeriesItem[], months: string[]) =>
  valueOverTime(items, {
    months,
    currency: "NOK",
    utcOffsetMinutes: OSLO,
    ratesFor: () => null,
  });

describe("when an Item starts", () => {
  test("is the start of its purchase date when it was bought before it was recorded", () => {
    const item = {
      _creationTime: Date.parse("2026-10-12T09:00:00Z"),
      purchaseDate: "2024-03-15",
    };
    expect(startOf(item, OSLO)).toBe(Date.parse("2024-03-14T23:00:00Z"));
  });
});

describe("the months a series covers", () => {
  test("run from the earliest purchase month through the current month", () => {
    const items = [
      coin({ purchaseDate: "2026-07-31" }),
      coin({ purchaseDate: "2026-08-20" }),
      coin({}),
    ];
    expect(seriesMonths(items, "2026-10", OSLO)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  test("start no earlier than January 1900, whatever the purchase date says", () => {
    // A purchase date mistyped as the year 202.
    const months = seriesMonths(
      [coin({ purchaseDate: "0202-05-01" })],
      "2026-10",
      OSLO,
    );
    // 126 whole years from 1900 to 2025, then ten months of 2026.
    expect(months.length).toBe(1522);
    expect(months[0]).toBe("1900-01");
    expect(months.at(-1)).toBe("2026-10");
  });
});

describe("pages of a Collection combined", () => {
  test("run from the earliest purchase month in any page through the current month", () => {
    // One page holds a coin bought in August 2026 for 50.00 kr, the other
    // one without a purchase date at 20.00 kr; both recorded in October at
    // 70.00 kr and 30.00 kr.
    const bought = coin({
      purchaseDate: "2026-08-20",
      purchasePrice: 5_000,
      marketValue: 7_000,
      history: [{ at: RECORDED, marketValue: 7_000, quantity: 1 }],
    });
    const recorded = coin({
      purchasePrice: 2_000,
      marketValue: 3_000,
      history: [{ at: RECORDED, marketValue: 3_000, quantity: 1 }],
    });
    const pageOf = (item: SeriesItem) =>
      seriesOf([item], seriesMonths([item], "2026-10", OSLO));
    expect(combineValueOverTime(pageOf(recorded), pageOf(bought))).toEqual([
      {
        month: "2026-08",
        purchasePrice: 5_000,
        marketValue: 5_000,
        metalValue: null,
      },
      {
        month: "2026-09",
        purchasePrice: 5_000,
        marketValue: 5_000,
        metalValue: null,
      },
      {
        month: "2026-10",
        purchasePrice: 7_000,
        marketValue: 10_000,
        metalValue: null,
      },
    ]);
  });
});

describe("pages of a Collection, however split", () => {
  test("combine to the same series as one page", () => {
    // All recorded in October 2026: a coin bought on 20 August for 50.00 kr,
    // valued at 70.00 kr; one without a purchase date at 20.00 kr, valued at
    // 30.00 kr; and 10 g of gold at 0.9 fine bought on 5 September for
    // 4,000.00 kr, valued at 6,000.00 kr. Gold at 600.00 kr a gram makes it
    // 5,400.00 kr of metal.
    const bought = coin({
      purchaseDate: "2026-08-20",
      purchasePrice: 5_000,
      marketValue: 7_000,
      history: [{ at: RECORDED, marketValue: 7_000, quantity: 1 }],
    });
    const recorded = coin({
      purchasePrice: 2_000,
      marketValue: 3_000,
      history: [{ at: RECORDED, marketValue: 3_000, quantity: 1 }],
    });
    const gold = coin({
      metal: "gold",
      weight: 10,
      purity: 0.9,
      purchaseDate: "2026-09-05",
      purchasePrice: 400_000,
      marketValue: 600_000,
      history: [{ at: RECORDED, marketValue: 600_000, quantity: 1 }],
    });
    const pageOf = (items: SeriesItem[]) =>
      valueOverTime(items, {
        months: seriesMonths(items, "2026-10", OSLO),
        currency: "NOK",
        utcOffsetMinutes: OSLO,
        ratesFor: () => goldAt(60_000),
      });
    const splits: SeriesItem[][][] = [
      [[bought, recorded, gold]],
      [[bought], [recorded, gold]],
      [[gold, recorded], [bought]],
      [[recorded], [], [gold], [bought]],
    ];
    for (const pages of splits) {
      expect(pages.map(pageOf).reduce(combineValueOverTime, [])).toEqual([
        {
          month: "2026-08",
          purchasePrice: 5_000,
          marketValue: 5_000,
          metalValue: 0,
        },
        {
          month: "2026-09",
          purchasePrice: 405_000,
          marketValue: 405_000,
          metalValue: 540_000,
        },
        {
          month: "2026-10",
          purchasePrice: 407_000,
          marketValue: 610_000,
          metalValue: 540_000,
        },
      ]);
    }
  });
});

describe("the series for an Item bought before it was recorded", () => {
  test("counts it at its Purchase price until its first recorded Market value", () => {
    // Two pieces at 100.00 kr, bought in March 2024, recorded in October 2026
    // with a Market value of 150.00 kr each.
    const item = coin({
      purchaseDate: "2024-03-15",
      quantity: 2,
      purchasePrice: 10_000,
      marketValue: 15_000,
      history: [{ at: RECORDED, marketValue: 15_000, quantity: 2 }],
    });
    expect(
      seriesOf([item], ["2024-02", "2024-03", "2026-09", "2026-10"]),
    ).toEqual([
      { month: "2024-02", purchasePrice: 0, marketValue: 0, metalValue: null },
      {
        month: "2024-03",
        purchasePrice: 20_000,
        marketValue: 20_000,
        metalValue: null,
      },
      {
        month: "2026-09",
        purchasePrice: 20_000,
        marketValue: 20_000,
        metalValue: null,
      },
      {
        month: "2026-10",
        purchasePrice: 20_000,
        marketValue: 30_000,
        metalValue: null,
      },
    ]);
  });

  test("counts it at its Purchase price after it was recorded too, until its first Market value", () => {
    // 100.00 kr, bought in March 2024, recorded in October 2026 without a
    // Market value, valued at 120.00 kr in December.
    const item = coin({
      purchaseDate: "2024-03-15",
      purchasePrice: 10_000,
      marketValue: 12_000,
      history: [
        { at: RECORDED, quantity: 1 },
        {
          at: Date.parse("2026-12-03T10:00:00Z"),
          marketValue: 12_000,
          quantity: 1,
        },
      ],
    });
    expect(
      seriesOf([item], ["2024-03", "2026-10", "2026-11", "2026-12"]),
    ).toEqual([
      {
        month: "2024-03",
        purchasePrice: 10_000,
        marketValue: 10_000,
        metalValue: null,
      },
      {
        month: "2026-10",
        purchasePrice: 10_000,
        marketValue: 10_000,
        metalValue: null,
      },
      {
        month: "2026-11",
        purchasePrice: 10_000,
        marketValue: 10_000,
        metalValue: null,
      },
      {
        month: "2026-12",
        purchasePrice: 10_000,
        marketValue: 12_000,
        metalValue: null,
      },
    ]);
  });

  test("counts it at its Purchase price until it was recorded when its history isn't kept yet", () => {
    // From before history was kept: 100.00 kr, bought in March 2024,
    // recorded in October 2026, valued at 150.00 kr.
    const item = coin({
      purchaseDate: "2024-03-15",
      purchasePrice: 10_000,
      marketValue: 15_000,
    });
    expect(seriesOf([item], ["2024-03", "2026-09", "2026-10"])).toEqual([
      {
        month: "2024-03",
        purchasePrice: 10_000,
        marketValue: 10_000,
        metalValue: null,
      },
      {
        month: "2026-09",
        purchasePrice: 10_000,
        marketValue: 10_000,
        metalValue: null,
      },
      {
        month: "2026-10",
        purchasePrice: 10_000,
        marketValue: 15_000,
        metalValue: null,
      },
    ]);
  });

  test("still leaves it from its sale month and adds its Metal value at each month's Spot price", () => {
    // A gold coin of 10 g at 0.9 fine, 4,000.00 kr, bought in March 2024,
    // recorded in October 2026 at 6,000.00 kr, sold on 5 November 2026.
    const item = coin({
      metal: "gold",
      weight: 10,
      purity: 0.9,
      purchaseDate: "2024-03-15",
      purchasePrice: 400_000,
      marketValue: 600_000,
      soldOn: "2026-11-05",
      history: [{ at: RECORDED, marketValue: 600_000, quantity: 1 }],
    });
    // Gold at 500.00 kr a gram in March 2024, 600.00 kr later.
    const perGram: Record<string, number> = {
      "2024-03": 50_000,
      "2026-10": 60_000,
      "2026-11": 60_000,
    };
    const series = valueOverTime([item], {
      months: ["2024-03", "2026-10", "2026-11"],
      currency: "NOK",
      utcOffsetMinutes: OSLO,
      ratesFor: (month) => goldAt(perGram[month] ?? 0),
    });
    expect(series).toEqual([
      {
        month: "2024-03",
        purchasePrice: 400_000,
        marketValue: 400_000,
        metalValue: 450_000,
      },
      {
        month: "2026-10",
        purchasePrice: 400_000,
        marketValue: 600_000,
        metalValue: 540_000,
      },
      { month: "2026-11", purchasePrice: 0, marketValue: 0, metalValue: 0 },
    ]);
  });

  test("counts no Market value for it when it has never had one", () => {
    // 100.00 kr a piece, bought in March 2024, recorded in October 2026
    // without a Market value; two more pieces in December, still without.
    const item = coin({
      purchaseDate: "2024-03-15",
      quantity: 3,
      purchasePrice: 10_000,
      history: [
        { at: RECORDED, quantity: 1 },
        { at: Date.parse("2026-12-03T10:00:00Z"), quantity: 3 },
      ],
    });
    expect(seriesOf([item], ["2024-03", "2026-10", "2026-12"])).toEqual([
      {
        month: "2024-03",
        purchasePrice: 10_000,
        marketValue: 0,
        metalValue: null,
      },
      {
        month: "2026-10",
        purchasePrice: 10_000,
        marketValue: 0,
        metalValue: null,
      },
      {
        month: "2026-12",
        purchasePrice: 30_000,
        marketValue: 0,
        metalValue: null,
      },
    ]);
  });
});

describe("the series for an Item without a purchase date", () => {
  test("starts when it was recorded and counts no Market value before it has one", () => {
    // 100.00 kr, recorded in October 2026 without a Market value, valued at
    // 120.00 kr in December.
    const item = coin({
      purchasePrice: 10_000,
      marketValue: 12_000,
      history: [
        { at: RECORDED, quantity: 1 },
        {
          at: Date.parse("2026-12-03T10:00:00Z"),
          marketValue: 12_000,
          quantity: 1,
        },
      ],
    });
    expect(
      seriesOf([item], ["2026-09", "2026-10", "2026-11", "2026-12"]),
    ).toEqual([
      { month: "2026-09", purchasePrice: 0, marketValue: 0, metalValue: null },
      {
        month: "2026-10",
        purchasePrice: 10_000,
        marketValue: 0,
        metalValue: null,
      },
      {
        month: "2026-11",
        purchasePrice: 10_000,
        marketValue: 0,
        metalValue: null,
      },
      {
        month: "2026-12",
        purchasePrice: 10_000,
        marketValue: 12_000,
        metalValue: null,
      },
    ]);
  });

  test("leaves it from the month it was sold in, even when sold on the month's last day", () => {
    // Recorded in January 2026: a coin at 100.00 kr, worth 150.00 kr, sold
    // on 28 February; a banknote at 50.00 kr, worth 80.00 kr, kept.
    const sold = coin({
      _creationTime: Date.parse("2026-01-10T12:00:00Z"),
      purchasePrice: 10_000,
      marketValue: 15_000,
      salePrice: 18_000,
      soldOn: "2026-02-28",
    });
    const kept = coin({
      _creationTime: Date.parse("2026-01-20T12:00:00Z"),
      type: "banknote",
      purchasePrice: 5_000,
      marketValue: 8_000,
    });
    expect(seriesOf([sold, kept], ["2026-01", "2026-02", "2026-03"])).toEqual([
      {
        month: "2026-01",
        purchasePrice: 15_000,
        marketValue: 23_000,
        metalValue: null,
      },
      {
        month: "2026-02",
        purchasePrice: 5_000,
        marketValue: 8_000,
        metalValue: null,
      },
      {
        month: "2026-03",
        purchasePrice: 5_000,
        marketValue: 8_000,
        metalValue: null,
      },
    ]);
  });
});
