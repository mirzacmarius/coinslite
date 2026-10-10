/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { bullionPresets } from "./items/preciousMetal";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in. */
async function person(
  t: Test,
  email: string,
  extra: { setUp?: boolean; homeCurrency?: "NOK" | "EUR" } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: extra.homeCurrency ?? "NOK",
      }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type ItemArgs = FunctionArgs<typeof api.items.add>;

afterEach(() => {
  vi.useRealTimers();
});

const quotedAt = Date.UTC(2026, 9, 9, 12, 0);

/**
 * Stores Spot prices as the scheduled refresh does. What one US dollar buys:
 * gold at 2400 dollars a troy ounce, silver at 30, and 10 kroner or 0.80 euro.
 */
const storeSpotPrices = (t: Test, { goldDollars = 2400 } = {}) =>
  t.mutation(internal.spotPrices.record, {
    quotedAt,
    perDollar: {
      XAU: 1 / goldDollars,
      XAG: 1 / 30,
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

const metalValueOf = (
  as: Awaited<ReturnType<typeof person>>["as"],
  itemId: Id<"items">,
) => as.query(api.metalValues.ofItem, { itemId });

const krugerrand: ItemArgs = {
  type: "coin",
  title: "Krugerrand 1 oz gold",
  country: "ZA",
  bullion: true,
  metal: "gold",
  weight: 33.93,
  purity: 0.9167,
};

test("a coin records its precious metal: bullion flag, metal, weight in grams and purity", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const itemId = await ada.as.mutation(api.items.add, krugerrand);

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    bullion: true,
    metal: "gold",
    weight: 33.93,
    purity: 0.9167,
  });
});

test("banknotes and stamps have no precious metal", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const plain = { title: "Not a coin" };

  for (const type of ["banknote", "stamp"] as const) {
    for (const metal of [
      { bullion: true },
      { metal: "silver" as const },
      { metal: "gold" as const, weight: 10, purity: 0.9 },
    ]) {
      await expect(
        ada.as.mutation(api.items.add, { type, ...plain, ...metal }),
      ).rejects.toThrow("FIELD_NOT_FOR_TYPE");
    }
  }
  const coinId = await ada.as.mutation(api.items.add, krugerrand);
  await expect(
    ada.as.mutation(api.items.update, {
      itemId: coinId,
      ...krugerrand,
      type: "banknote",
    }),
  ).rejects.toThrow("FIELD_NOT_FOR_TYPE");
  expect(await ada.as.query(api.items.get, { itemId: coinId })).toMatchObject({
    type: "coin",
    metal: "gold",
  });
});

test("weight and purity can only be set once a metal is chosen", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const coin = { type: "coin" as const, title: "Unknown bullion" };

  await expect(
    ada.as.mutation(api.items.add, { ...coin, weight: 31.103 }),
  ).rejects.toThrow("METAL_REQUIRED");
  await expect(
    ada.as.mutation(api.items.add, { ...coin, purity: 0.999 }),
  ).rejects.toThrow("METAL_REQUIRED");

  const itemId = await ada.as.mutation(api.items.add, {
    ...coin,
    bullion: true,
    metal: "silver",
  });
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    bullion: true,
    metal: "silver",
  });
});

test("weight is above 0 grams and purity above 0 and at most 1; weights keep milligrams", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const add = (fields: Partial<ItemArgs>) =>
    ada.as.mutation(api.items.add, { ...krugerrand, ...fields });

  for (const fields of [
    { weight: 0 },
    { weight: -3 },
    { weight: 100_001 },
    { purity: 0 },
    { purity: 1.01 },
    { purity: 916.7 },
  ]) {
    await expect(add(fields)).rejects.toThrow("INVALID_NUMBER");
  }

  const pure = await add({ weight: 31.10348, purity: 1 });
  expect(await ada.as.query(api.items.get, { itemId: pure })).toMatchObject({
    weight: 31.103,
    purity: 1,
  });
  const finest = await add({ weight: 100_000, purity: 0.99999 });
  expect(await ada.as.query(api.items.get, { itemId: finest })).toMatchObject({
    weight: 100_000,
    purity: 0.99999,
  });
});

test("Metal value is weight × purity × Spot price × Quantity, in the Home currency", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await storeSpotPrices(t);
  const twoKrugerrands = await ada.as.mutation(api.items.add, {
    ...krugerrand,
    quantity: 2,
  });
  const threePandas = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Panda 30 g silver",
    metal: "silver",
    weight: 30,
    purity: 0.999,
    quantity: 3,
  });

  // 33.93 g × 0.9167 = 31.1036 g of gold, a hair over a troy ounce at
  // 24 000 kr: 24 000.12 kr a piece, 48 000.24 kr for two.
  expect(await metalValueOf(ada.as, twoKrugerrands)).toEqual({
    amount: 4_800_024,
    currency: "NOK",
    quotedAt,
    stale: false,
  });
  // 29.97 g of silver at 9.6452 kr a gram (300 kr an ounce) is 289.07 kr; × 3.
  expect(await metalValueOf(ada.as, threePandas)).toMatchObject({
    amount: 86_720,
  });
});

test("before the first Spot prices there is no Metal value", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, krugerrand);

  expect(await metalValueOf(ada.as, itemId)).toBeNull();

  await storeSpotPrices(t);
  expect(await metalValueOf(ada.as, itemId)).toMatchObject({
    amount: 2_400_012,
  });
});

test("out-of-date Spot prices still give a Metal value, marked stale", async () => {
  vi.useFakeTimers({ now: quotedAt + 60 * 1000 });
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, krugerrand);
  await storeSpotPrices(t);

  // Refreshes fail for more than an hour; the last prices stay in place.
  vi.advanceTimersByTime(61 * 60 * 1000);
  await t.mutation(internal.spotPrices.recordFailedRefresh, {});

  expect(await metalValueOf(ada.as, itemId)).toEqual({
    amount: 2_400_012,
    currency: "NOK",
    quotedAt,
    stale: true,
  });
});

test("a coin needs a metal, weight and purity for a Metal value, and it follows edits", async () => {
  const t = newTest();
  const bea = await person(t, "bea@example.com", { homeCurrency: "EUR" });
  await storeSpotPrices(t);
  const maple = {
    type: "coin" as const,
    title: "Maple Leaf 1 oz gold",
    metal: "gold" as const,
  };
  const itemId = await bea.as.mutation(api.items.add, maple);
  const plain = await bea.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone 1875",
    bullion: true,
  });

  expect(await metalValueOf(bea.as, itemId)).toBeNull();
  expect(await metalValueOf(bea.as, plain)).toBeNull();

  await bea.as.mutation(api.items.update, {
    itemId,
    ...maple,
    weight: 31.103,
    purity: 0.9999,
  });
  // 31.0999 g of gold at 1920 € an ounce (61.73 € a gram).
  expect(await metalValueOf(bea.as, itemId)).toEqual({
    amount: 191_978,
    currency: "EUR",
    quotedAt,
    stale: false,
  });

  await bea.as.mutation(api.items.update, {
    itemId,
    ...maple,
    weight: 31.103,
    purity: 0.9999,
    quantity: 10,
  });
  expect(await metalValueOf(bea.as, itemId)).toMatchObject({
    amount: 1_919_779,
  });
});

test("only the owner sees an Item's Metal value", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  await storeSpotPrices(t);
  const itemId = await ada.as.mutation(api.items.add, krugerrand);

  expect(await metalValueOf(bob.as, itemId)).toBeNull();
  await expect(t.query(api.metalValues.ofItem, { itemId })).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(metalValueOf(newcomer.as, itemId)).rejects.toThrow("NOT_SET_UP");
});

test("the bullion presets are the ones in the spec, and each saves as a coin with a Metal value", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await storeSpotPrices(t);

  expect(
    bullionPresets.map(({ metal, weight, purity, country }) => [
      metal,
      weight,
      purity,
      country,
    ]),
  ).toEqual([
    // Krugerrand 1 oz, ½, ¼ and 1⁄10
    ["gold", 33.93, 0.9167, "ZA"],
    ["gold", 16.965, 0.9167, "ZA"],
    ["gold", 8.482, 0.9167, "ZA"],
    ["gold", 3.393, 0.9167, "ZA"],
    ["gold", 31.103, 0.9999, "CA"], // Maple Leaf
    ["gold", 31.103, 0.9999, "GB"], // Britannia
    ["gold", 31.103, 0.9999, "AT"], // Vienna Philharmonic
    ["gold", 33.93, 0.9167, "US"], // American Eagle
    ["gold", 31.103, 0.9999, "US"], // American Buffalo
    ["gold", 30, 0.9999, "CN"], // Panda 30 g
    ["silver", 31.103, 0.9999, "CA"], // Maple Leaf
    ["silver", 31.103, 0.999, "US"], // American Eagle
    ["silver", 31.103, 0.999, "GB"], // Britannia
    ["silver", 31.103, 0.999, "AT"], // Vienna Philharmonic
    ["silver", 31.107, 0.999, "ZA"], // Krugerrand
    ["silver", 30, 0.999, "CN"], // Panda 30 g
  ]);
  expect(new Set(bullionPresets.map(({ id }) => id)).size).toBe(16);

  for (const { id, metal, weight, purity, country } of bullionPresets) {
    const itemId = await ada.as.mutation(api.items.add, {
      type: "coin",
      title: id,
      bullion: true,
      metal,
      weight,
      purity,
      country,
    });
    expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
      metal,
      weight,
      purity,
      country,
    });
    expect((await metalValueOf(ada.as, itemId))?.amount).toBeGreaterThan(0);
  }
});
