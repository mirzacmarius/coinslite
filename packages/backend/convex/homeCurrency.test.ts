/// <reference types="vite/client" />
import type { HomeCurrency } from "@coinslite/i18n";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { homeCurrencyLimits } from "./homeCurrency/rules";
import { itemLimits } from "./items/rules";
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
  extra: { setUp?: boolean; homeCurrency?: HomeCurrency } = {},
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

/** What one US dollar buys: units of each Home currency, and troy ounces of gold and silver. */
const perDollar = {
  NOK: 10,
  SEK: 10.5,
  DKK: 6,
  EUR: 0.8,
  RON: 4,
  GBP: 0.75,
  USD: 1,
  CHF: 0.9,
  XAU: 1 / 2400,
  XAG: 1 / 30,
};
const quotedAt = Date.UTC(2026, 9, 9, 12, 0);

/** Stores exchange rates the way the scheduled refresh does. */
async function storeRates(
  t: Test,
  rates: Partial<typeof perDollar> = {},
  at = quotedAt,
) {
  await t.mutation(internal.spotPrices.record, {
    quotedAt: at,
    perDollar: { ...perDollar, ...rates },
  });
}

/** Adds an Item the way the Item form does. */
async function addItem(
  as: ReturnType<Test["withIdentity"]>,
  amounts: { purchasePrice?: number; marketValue?: number } = {},
) {
  return await as.mutation(api.items.add, {
    type: "coin",
    title: "1 krone 1875",
    ...amounts,
  });
}

const homeCurrencyOf = async (as: ReturnType<Test["withIdentity"]>) =>
  (await as.query(api.account.get, {}))?.homeCurrency;

/** The rate the preview shows for changing to `to`, as the confirmation sends it back. */
async function shownRate(
  as: ReturnType<Test["withIdentity"]>,
  to: HomeCurrency,
) {
  const preview = await as.query(api.homeCurrency.preview, {
    homeCurrency: to,
  });
  return preview.rate?.value;
}

/** Every Item's amounts and currency, oldest first, as the person sees them. */
async function amountsIn(
  as: ReturnType<Test["withIdentity"]>,
  ids: Id<"items">[],
) {
  return await Promise.all(
    ids.map(async (itemId) => {
      const item = await as.query(api.items.get, { itemId });
      return [item?.currency, item?.purchasePrice, item?.marketValue];
    }),
  );
}

/**
 * Fills a Collection with `count` Items bought for 8 kr and worth 10 kr each,
 * as if added over time, each with a paragraph of notes.
 */
async function collectionOf(t: Test, ownerId: Id<"users">, count: number) {
  await t.run(async (ctx) => {
    for (let n = 1; n <= count; n++) {
      await ctx.db.insert("items", {
        ownerId,
        type: "coin",
        title: `1 krone ${1800 + (n % 200)}`,
        country: "NO",
        quantity: 1,
        purchasePrice: 800,
        marketValue: 1000,
        purchaseDate: "2024-05-01",
        source: "Oslo coin fair",
        notes: "Bought at the spring fair. ".repeat(40),
      });
    }
  });
}

test("with an empty Collection the Home currency changes at once, with no exchange rate needed", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toEqual({
    from: "NOK",
    to: "EUR",
    amounts: 0,
    items: 0,
    tooLarge: false,
    rate: null,
  });
  expect(
    await ada.as.mutation(api.homeCurrency.change, { homeCurrency: "EUR" }),
  ).toEqual({ converted: 0 });

  expect(await homeCurrencyOf(ada.as)).toBe("EUR");
});

test("Items without a Purchase price or Market value need no exchange rate either", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  const item = await addItem(ada.as);

  expect(
    await ada.as.mutation(api.homeCurrency.change, { homeCurrency: "GBP" }),
  ).toEqual({ converted: 0 });

  expect(await amountsIn(ada.as, [item])).toEqual([
    ["GBP", undefined, undefined],
  ]);
});

test("the preview counts the stored amounts to convert and names the exchange rate", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  await addItem(ada.as, { purchasePrice: 150000, marketValue: 200000 });
  await addItem(ada.as, { marketValue: 5000 });
  await addItem(ada.as);

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toEqual({
    from: "NOK",
    to: "EUR",
    amounts: 3,
    items: 2,
    tooLarge: false,
    // 0.80 euro and 10 kroner to the dollar: one krone is 0.08 euro.
    rate: { value: 0.08, quotedAt, stale: false },
  });
});

test("confirming converts every Purchase price and Market value at the rate shown", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  const both = await addItem(ada.as, {
    purchasePrice: 150000,
    marketValue: 200000,
  });
  const valued = await addItem(ada.as, { marketValue: 5000 });
  const plain = await addItem(ada.as);

  expect(
    await ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: await shownRate(ada.as, "EUR"),
    }),
  ).toEqual({ converted: 3 });

  expect(await homeCurrencyOf(ada.as)).toBe("EUR");
  // 1 500 kr and 2 000 kr at 0.08 are 120 € and 160 €; 50 kr is 4 €.
  expect(await ada.as.query(api.items.get, { itemId: both })).toMatchObject({
    currency: "EUR",
    purchasePrice: 12000,
    marketValue: 16000,
  });
  const onlyValued = await ada.as.query(api.items.get, { itemId: valued });
  expect(onlyValued).toMatchObject({ currency: "EUR", marketValue: 400 });
  expect(onlyValued?.purchasePrice).toBeUndefined();
  const withoutAmounts = await ada.as.query(api.items.get, { itemId: plain });
  expect(withoutAmounts?.purchasePrice).toBeUndefined();
  expect(withoutAmounts?.marketValue).toBeUndefined();
});

test("converted amounts are rounded to whole minor units, halves up", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  // 10 kroner and 10.50 Swedish kronor to the dollar: one krone is 1.05 kronor.
  await storeRates(t);
  const cases = [
    // 0.10 kr is 0.105 SEK: half an öre rounds up to 0.11.
    { nok: 10, sek: 11 },
    // 0.29 kr is 0.3045 SEK: rounds down to 0.30.
    { nok: 29, sek: 30 },
    // 0.01 kr is 0.0105 SEK: rounds to 0.01.
    { nok: 1, sek: 1 },
    // Nothing stays nothing.
    { nok: 0, sek: 0 },
    // 19.99 kr is 20.9895 SEK: rounds up to 20.99.
    { nok: 1999, sek: 2099 },
  ];
  const ids = [];
  for (const { nok } of cases) {
    ids.push(await addItem(ada.as, { purchasePrice: nok, marketValue: nok }));
  }

  await ada.as.mutation(api.homeCurrency.change, {
    homeCurrency: "SEK",
    rate: await shownRate(ada.as, "SEK"),
  });

  for (const [index, { sek }] of cases.entries()) {
    expect(
      await ada.as.query(api.items.get, { itemId: ids[index] }),
    ).toMatchObject({ currency: "SEK", purchasePrice: sek, marketValue: sek });
  }
});

test("without a stored exchange rate, a Collection with amounts keeps its Home currency", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  const item = await addItem(ada.as, { purchasePrice: 150000 });

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toMatchObject({ amounts: 1, rate: null });
  await expect(
    ada.as.mutation(api.homeCurrency.change, { homeCurrency: "EUR" }),
  ).rejects.toThrow("RATE_UNAVAILABLE");

  expect(await homeCurrencyOf(ada.as)).toBe("NOK");
  expect(await ada.as.query(api.items.get, { itemId: item })).toMatchObject({
    currency: "NOK",
    purchasePrice: 150000,
  });
});

test("when the rates were refreshed after the preview, nothing changes until the new rate is confirmed", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  const item = await addItem(ada.as, { purchasePrice: 150000 });
  const seen = await shownRate(ada.as, "EUR");

  // The euro strengthens to 0.75 to the dollar before the person confirms.
  await storeRates(t, { EUR: 0.75 }, quotedAt + 15 * 60 * 1000);
  await expect(
    ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: seen,
    }),
  ).rejects.toThrow("RATE_CHANGED");
  // Confirming without a rate is no better: amounts are never converted at a rate nobody saw.
  await expect(
    ada.as.mutation(api.homeCurrency.change, { homeCurrency: "EUR" }),
  ).rejects.toThrow("RATE_CHANGED");
  expect(await homeCurrencyOf(ada.as)).toBe("NOK");

  await ada.as.mutation(api.homeCurrency.change, {
    homeCurrency: "EUR",
    rate: await shownRate(ada.as, "EUR"),
  });
  // 1 500 kr at 0.075 is 112.50 €.
  expect(await ada.as.query(api.items.get, { itemId: item })).toMatchObject({
    currency: "EUR",
    purchasePrice: 11250,
  });
});

test("a change that fails part-way leaves every amount and the Home currency as they were", async () => {
  // A database that takes at most three writes per transaction: the change
  // below fails after converting some Items.
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { documentsWritten: 3 },
  });
  rateLimiter.register(t);
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  const ids = [];
  for (const amount of [1000, 2000, 3000, 4000, 5000]) {
    ids.push(
      await addItem(ada.as, { purchasePrice: amount, marketValue: amount }),
    );
  }
  const before = await amountsIn(ada.as, ids);

  await expect(
    ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: await shownRate(ada.as, "EUR"),
    }),
  ).rejects.toThrow("Wrote too many documents");

  expect(await homeCurrencyOf(ada.as)).toBe("NOK");
  expect(await amountsIn(ada.as, ids)).toEqual(before);
});

test("an amount too large for the new currency stops the whole change", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "EUR" });
  await storeRates(t);
  const ids = [
    await addItem(ada.as, { purchasePrice: 1000, marketValue: 2000 }),
    // The largest amount an Item holds, in euro: 12.5 times as many kroner is too many.
    await addItem(ada.as, { marketValue: itemLimits.amount }),
  ];
  const before = await amountsIn(ada.as, ids);

  await expect(
    ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "NOK",
      rate: await shownRate(ada.as, "NOK"),
    }),
  ).rejects.toThrow("AMOUNT_TOO_LARGE");

  expect(await homeCurrencyOf(ada.as)).toBe("EUR");
  expect(await amountsIn(ada.as, ids)).toEqual(before);
});

test("the current Home currency can't be chosen again", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  const item = await addItem(ada.as, { purchasePrice: 150000 });

  await expect(
    ada.as.mutation(api.homeCurrency.change, { homeCurrency: "NOK", rate: 1 }),
  ).rejects.toThrow("SAME_CURRENCY");
  expect(await amountsIn(ada.as, [item])).toEqual([["NOK", 150000, undefined]]);
});

test("a Collection with more Items than one change converts keeps its Home currency, and the preview says so", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  await collectionOf(t, ada.userId, homeCurrencyLimits.items + 1);

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toMatchObject({ tooLarge: true });
  await expect(
    ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: await shownRate(ada.as, "EUR"),
    }),
  ).rejects.toThrow("COLLECTION_TOO_LARGE");
  expect(await homeCurrencyOf(ada.as)).toBe("NOK");
});

test("the largest Collection one change converts fits in one transaction", async () => {
  // The database's real per-transaction limits.
  const t = convexTest({ schema, modules, transactionLimits: true });
  rateLimiter.register(t);
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  await collectionOf(t, ada.userId, homeCurrencyLimits.items);

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toMatchObject({ tooLarge: false, amounts: 2 * homeCurrencyLimits.items });
  expect(
    await ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: await shownRate(ada.as, "EUR"),
    }),
  ).toEqual({ converted: 2 * homeCurrencyLimits.items });
});

test("only the person's own Collection is counted and converted", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com", { homeCurrency: "NOK" });
  const bea = await person(t, "bea@example.com", { homeCurrency: "NOK" });
  await storeRates(t);
  await addItem(ada.as, { purchasePrice: 150000 });
  const beas = await addItem(bea.as, {
    purchasePrice: 9000,
    marketValue: 9900,
  });

  expect(
    await ada.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).toMatchObject({ amounts: 1, items: 1 });
  expect(
    await ada.as.mutation(api.homeCurrency.change, {
      homeCurrency: "EUR",
      rate: await shownRate(ada.as, "EUR"),
    }),
  ).toEqual({ converted: 1 });

  expect(await homeCurrencyOf(bea.as)).toBe("NOK");
  expect(await amountsIn(bea.as, [beas])).toEqual([["NOK", 9000, 9900]]);
});

test("changing the Home currency is for signed-in people who have finished signing up", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });
  await storeRates(t);

  await expect(
    t.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.mutation(api.homeCurrency.change, { homeCurrency: "EUR" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    newcomer.as.query(api.homeCurrency.preview, { homeCurrency: "EUR" }),
  ).rejects.toThrow("NOT_SET_UP");
  await expect(
    newcomer.as.mutation(api.homeCurrency.change, { homeCurrency: "EUR" }),
  ).rejects.toThrow("NOT_SET_UP");
});
