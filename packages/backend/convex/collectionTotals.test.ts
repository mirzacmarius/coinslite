/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import {
  type CollectionTotals,
  combineTotals,
  valueByDateAdded,
  valueDistribution,
} from "./items/totals";
import schema from "./schema";
import { TROY_OUNCE_GRAMS } from "./spotPrices/rates";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in. */
async function person(t: Test, email: string, extra: { setUp?: boolean } = {}) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Signed = Awaited<ReturnType<typeof person>>["as"];
type ItemArgs = FunctionArgs<typeof api.items.add>;

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Stores Spot prices as the scheduled refresh does, with one US dollar buying
 * 10 kroner: gold at 1000.00 kroner a gram and silver at 10.00.
 */
const storeSpotPrices = (t: Test) =>
  t.mutation(internal.spotPrices.record, {
    quotedAt: Date.UTC(2026, 9, 9, 12, 0),
    perDollar: {
      XAU: 10 / (1000 * TROY_OUNCE_GRAMS),
      XAG: 10 / (10 * TROY_OUNCE_GRAMS),
      NOK: 10,
      SEK: 10.5,
      DKK: 6,
      EUR: 0.8,
      RON: 4,
      GBP: 0.75,
      USD: 1,
      CHF: 0.9,
    },
  });

const add = (as: Signed, item: Partial<ItemArgs> = {}) =>
  as.mutation(api.items.add, { type: "coin", title: "Krone", ...item });

/** Sets the clock: creation times only move forward, so set it before anything is created. */
const setClock = (moment: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(moment));
};

/** Adds an Item at a given moment ("2026-01-15T10:00Z"). */
const addAt = (as: Signed, moment: string, item: Partial<ItemArgs> = {}) => {
  setClock(moment);
  return add(as, item);
};

/**
 * The whole Collection's totals as the app reads them: page by page, each page
 * summed on the server, the pages combined.
 */
async function totalsOf(
  as: Signed,
  {
    pageSize = 100,
    utcOffsetMinutes = 0,
    status,
  }: { pageSize?: number; utcOffsetMinutes?: number; status?: "sold" } = {},
): Promise<CollectionTotals> {
  let cursor: string | null = null;
  let totals: CollectionTotals | undefined;
  for (;;) {
    const result: {
      page: CollectionTotals[];
      isDone: boolean;
      continueCursor: string;
    } = await as.query(api.collectionTotals.page, {
      paginationOpts: { numItems: pageSize, cursor },
      utcOffsetMinutes,
      status,
    });
    for (const page of result.page) {
      totals = totals ? combineTotals(totals, page) : page;
    }
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  if (!totals) throw new Error("No pages");
  return totals;
}

test("counts Items, and pieces per Item type by Quantity", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { type: "coin", quantity: 3 });
  await add(ada.as, { type: "coin" });
  await add(ada.as, { type: "banknote", title: "100 kroner", quantity: 2 });

  const totals = await totalsOf(ada.as);

  expect(totals.items).toBe(3);
  expect(totals.pieces).toEqual({ coin: 4, banknote: 2, stamp: 0 });
});

test("totals the Purchase price and Market value of every piece", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  // 3 × 100.00 paid, 3 × 150.00 worth
  await add(ada.as, {
    quantity: 3,
    purchasePrice: 10_000,
    marketValue: 15_000,
  });
  // Paid 20.00, no Market value yet
  await add(ada.as, { purchasePrice: 2_000 });
  // 2 × 50.00 worth, inherited: no Purchase price
  await add(ada.as, { type: "stamp", quantity: 2, marketValue: 5_000 });
  // Neither
  await add(ada.as, { type: "banknote" });

  const totals = await totalsOf(ada.as);

  expect(totals.currency).toBe("NOK");
  expect(totals.purchasePrice).toBe(32_000);
  expect(totals.marketValue).toBe(55_000);
});

test("Gain/loss counts only Items with both a Purchase price and a Market value", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  // Gained 3 × 50.00
  await add(ada.as, {
    quantity: 3,
    purchasePrice: 10_000,
    marketValue: 15_000,
  });
  // Lost 2 × 30.00
  await add(ada.as, { quantity: 2, purchasePrice: 8_000, marketValue: 5_000 });
  // Left out: an unknown value isn't a loss, nor a gift a gain
  await add(ada.as, { purchasePrice: 2_000 });
  await add(ada.as, { marketValue: 5_000 });

  const totals = await totalsOf(ada.as);

  expect(totals.gainLoss).toEqual({ amount: 9_000, items: 2 });
});

test("Gain/loss can be a loss", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { quantity: 4, purchasePrice: 10_000, marketValue: 7_500 });

  const totals = await totalsOf(ada.as);

  expect(totals.gainLoss).toEqual({ amount: -10_000, items: 1 });
});

test("totals gold and silver by fine weight and Metal value", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  // 2 × 10 g at 900/1000: 18 g of gold
  await add(ada.as, { metal: "gold", weight: 10, purity: 0.9, quantity: 2 });
  // 31.1 g at 999/1000: 31.0689 g of gold
  await add(ada.as, { metal: "gold", weight: 31.1, purity: 0.999 });
  // 5 × 20 g at 925/1000: 92.5 g of silver
  await add(ada.as, {
    metal: "silver",
    weight: 20,
    purity: 0.925,
    quantity: 5,
  });
  // No weight or purity: no Metal value
  await add(ada.as, { metal: "silver" });

  const { metals } = await totalsOf(ada.as);

  expect(metals.gold.fineWeight).toBeCloseTo(49.0689, 6);
  // 18 g × 1000.00 + 31.0689 g × 1000.00, each Item rounded to the øre
  expect(metals.gold.value).toBe(1_800_000 + 3_106_890);
  expect(metals.silver.fineWeight).toBeCloseTo(92.5, 6);
  expect(metals.silver.value).toBe(92_500);
});

test("a Collection without precious metal has none", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { purchasePrice: 2_000 });

  const { metals } = await totalsOf(ada.as);

  expect(metals).toEqual({
    gold: { fineWeight: 0, value: 0 },
    silver: { fineWeight: 0, value: 0 },
  });
});

test("Metal values wait for the first Spot prices; fine weights don't", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { metal: "gold", weight: 10, purity: 0.9, quantity: 2 });

  const { metals } = await totalsOf(ada.as);

  expect(metals.gold.fineWeight).toBeCloseTo(18, 6);
  expect(metals.gold.value).toBeNull();
  expect(metals.silver).toEqual({ fineWeight: 0, value: null });
});

test("Value by date added: cumulative Purchase price and Market value by month", async () => {
  setClock("2025-01-01T00:00Z");
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAt(ada.as, "2025-11-03T10:00Z", {
    quantity: 2,
    purchasePrice: 10_000,
    marketValue: 12_000,
  });
  await addAt(ada.as, "2025-11-28T10:00Z", { purchasePrice: 5_000 });
  // Nothing added in December
  await addAt(ada.as, "2026-01-15T10:00Z", {
    quantity: 3,
    marketValue: 1_000,
  });
  await addAt(ada.as, "2026-02-01T08:00Z", {
    purchasePrice: 1_000,
    marketValue: 2_000,
  });

  const series = valueByDateAdded(await totalsOf(ada.as));

  expect(series).toEqual([
    { month: "2025-11", purchasePrice: 25_000, marketValue: 24_000 },
    { month: "2025-12", purchasePrice: 25_000, marketValue: 24_000 },
    { month: "2026-01", purchasePrice: 25_000, marketValue: 27_000 },
    { month: "2026-02", purchasePrice: 26_000, marketValue: 29_000 },
  ]);
});

test("Value by date added reads months in the person's time zone", async () => {
  setClock("2025-01-01T00:00Z");
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  // 00:30 on 1 February in Oslo (UTC+1), still January in UTC
  await addAt(ada.as, "2026-01-31T23:30Z", { purchasePrice: 1_000 });
  // 20:00 on 31 March in New York (UTC−4), already April in UTC
  await addAt(ada.as, "2026-04-01T00:00Z", { purchasePrice: 2_000 });

  const inOslo = valueByDateAdded(
    await totalsOf(ada.as, { utcOffsetMinutes: 60 }),
  );
  const inNewYork = valueByDateAdded(
    await totalsOf(ada.as, { utcOffsetMinutes: -240 }),
  );

  expect(inOslo.map(({ month }) => month)).toEqual([
    "2026-02",
    "2026-03",
    "2026-04",
  ]);
  expect(inNewYork.map(({ month }) => month)).toEqual([
    "2026-01",
    "2026-02",
    "2026-03",
  ]);
});

test("an empty Collection has no Value by date added", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  expect(valueByDateAdded(await totalsOf(ada.as))).toEqual([]);
});

test("Value distribution: by Item type, plus gold and silver Metal value", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await add(ada.as, {
    quantity: 2,
    purchasePrice: 10_000,
    marketValue: 12_000,
    metal: "gold",
    weight: 1,
    purity: 1,
  });
  await add(ada.as, { purchasePrice: 3_000 });
  await add(ada.as, { type: "stamp", quantity: 4, marketValue: 500 });
  await add(ada.as, { metal: "silver", weight: 10, purity: 0.5, quantity: 3 });

  const distribution = valueDistribution(await totalsOf(ada.as));

  // No banknotes: no banknote row
  expect(distribution).toEqual([
    { kind: "coin", purchasePrice: 23_000, marketValue: 24_000 },
    { kind: "stamp", purchasePrice: 0, marketValue: 2_000 },
    // 2 × 1 g of gold at 1000.00
    { kind: "gold", metalValue: 200_000 },
    // 3 × 5 g of silver at 10.00
    { kind: "silver", metalValue: 15_000 },
  ]);
});

test("Value distribution leaves out metals the Collection doesn't hold, and Metal values without Spot prices", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { type: "banknote", purchasePrice: 1_000 });
  await add(ada.as, { metal: "gold", weight: 1, purity: 1 });

  expect(valueDistribution(await totalsOf(ada.as))).toEqual([
    { kind: "coin", purchasePrice: 0, marketValue: 0 },
    { kind: "banknote", purchasePrice: 1_000, marketValue: 0 },
  ]);

  await storeSpotPrices(t);
  await add(ada.as, { type: "stamp" });

  expect(valueDistribution(await totalsOf(ada.as))).toEqual([
    { kind: "coin", purchasePrice: 0, marketValue: 0 },
    { kind: "banknote", purchasePrice: 1_000, marketValue: 0 },
    { kind: "stamp", purchasePrice: 0, marketValue: 0 },
    { kind: "gold", metalValue: 100_000 },
  ]);
});

test("a Collection read a page at a time adds up to the same totals", async () => {
  setClock("2025-01-01T00:00Z");
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await addAt(ada.as, "2025-03-10T10:00Z", {
    quantity: 2,
    purchasePrice: 10_000,
    marketValue: 9_000,
  });
  await addAt(ada.as, "2025-03-20T10:00Z", {
    metal: "gold",
    weight: 1,
    purity: 1,
  });
  await addAt(ada.as, "2025-05-01T10:00Z", {
    type: "stamp",
    marketValue: 700,
  });
  await addAt(ada.as, "2025-05-02T10:00Z", {
    metal: "silver",
    weight: 10,
    purity: 1,
    purchasePrice: 400,
  });
  await addAt(ada.as, "2025-06-01T10:00Z", {
    type: "banknote",
    quantity: 5,
    purchasePrice: 100,
    marketValue: 300,
  });

  const inPagesOfTwo = await totalsOf(ada.as, { pageSize: 2 });

  expect(inPagesOfTwo.items).toBe(5);
  expect(inPagesOfTwo).toEqual(await totalsOf(ada.as, { pageSize: 100 }));
  expect(valueByDateAdded(inPagesOfTwo)).toEqual([
    { month: "2025-03", purchasePrice: 20_000, marketValue: 18_000 },
    { month: "2025-04", purchasePrice: 20_000, marketValue: 18_000 },
    { month: "2025-05", purchasePrice: 20_400, marketValue: 18_700 },
    { month: "2025-06", purchasePrice: 20_900, marketValue: 20_200 },
  ]);
});

test("totals cover every Item, in an Album or not", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const albumId = await ada.as.mutation(api.albums.create, { name: "Travel" });
  await add(ada.as, { albumId, purchasePrice: 1_000 });
  await add(ada.as, { purchasePrice: 2_000 });

  const totals = await totalsOf(ada.as);

  expect(totals.items).toBe(2);
  expect(totals.purchasePrice).toBe(3_000);
});

test("totals cover only the signed-in person's own Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  await add(ada.as, { quantity: 2, purchasePrice: 10_000 });

  const bobs = await totalsOf(bob.as);

  expect(bobs.items).toBe(0);
  expect(bobs.purchasePrice).toBe(0);
  expect(valueByDateAdded(bobs)).toEqual([]);
  expect(valueDistribution(bobs)).toEqual([]);
});

test("totals need someone signed in who has finished signing up", async () => {
  const t = newTest();
  const carol = await person(t, "carol@example.com", { setUp: false });
  const args = {
    paginationOpts: { numItems: 10, cursor: null },
    utcOffsetMinutes: 0,
  };

  await expect(t.query(api.collectionTotals.page, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(carol.as.query(api.collectionTotals.page, args)).rejects.toThrow(
    "NOT_SET_UP",
  );
});

test("turns away a time zone that doesn't exist", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  for (const utcOffsetMinutes of [15 * 60, 0.5, Number.NaN]) {
    await expect(
      ada.as.query(api.collectionTotals.page, {
        paginationOpts: { numItems: 10, cursor: null },
        utcOffsetMinutes,
      }),
    ).rejects.toThrow("INVALID_UTC_OFFSET");
  }
});

test("sold Items leave the totals and Metal values; marking one owned brings it back", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await add(ada.as, {
    title: "Kept",
    purchasePrice: 2_000,
    marketValue: 3_000,
  });
  // 10 g of pure gold: 10,000.00 kroner of Metal value
  const gold = await add(ada.as, {
    title: "Gold",
    metal: "gold",
    weight: 10,
    purity: 1,
    purchasePrice: 900_000,
    marketValue: 1_100_000,
  });

  await ada.as.mutation(api.items.sell, { itemId: gold, soldOn: "2026-10-01" });
  const sold = await totalsOf(ada.as);
  expect(sold.items).toBe(1);
  expect(sold.purchasePrice).toBe(2_000);
  expect(sold.marketValue).toBe(3_000);
  expect(sold.metals.gold).toEqual({ fineWeight: 0, value: 0 });

  await ada.as.mutation(api.items.markOwned, { itemId: gold });
  const owned = await totalsOf(ada.as);
  expect(owned.items).toBe(2);
  expect(owned.metals.gold.value).toBe(1_000_000);
});

test("the sold Items' totals add up the sale prices and the realised Gain/loss of Items with both prices", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const sell = async (item: Partial<ItemArgs>, salePrice?: number) => {
    const itemId = await add(ada.as, item);
    await ada.as.mutation(api.items.sell, {
      itemId,
      soldOn: "2026-10-01",
      salePrice,
    });
  };
  // Gained 3 × 50.00
  await sell({ quantity: 3, purchasePrice: 10_000 }, 15_000);
  // Lost 2 × 30.00
  await sell({ quantity: 2, purchasePrice: 8_000 }, 5_000);
  // Left out of the realised figure: a gift sold, and a sale without a price
  await sell({}, 4_000);
  await sell({ purchasePrice: 2_000 });
  // Still owned: in neither
  await add(ada.as, { purchasePrice: 1_000, marketValue: 9_000 });

  const sold = await totalsOf(ada.as, { status: "sold" });
  expect(sold.items).toBe(4);
  expect(sold.salePrice).toBe(45_000 + 10_000 + 4_000);
  expect(sold.realised).toEqual({ amount: 15_000 - 6_000, items: 2 });

  const owned = await totalsOf(ada.as);
  expect(owned.items).toBe(1);
  expect(owned.salePrice).toBe(0);
  expect(owned.realised).toEqual({ amount: 0, items: 0 });
});
