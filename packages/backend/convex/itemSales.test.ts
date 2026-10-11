/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in. */
async function person(t: Test, email: string) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Person = Awaited<ReturnType<typeof person>>;

const addKrone = (who: Person, title = "1 krone 1875") =>
  who.as.mutation(api.items.add, {
    type: "coin",
    title,
    quantity: 2,
    purchasePrice: 15000,
  });

test("selling an Item stores the sold-on date, the sale price per piece and the note", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await addKrone(ada);

  await ada.as.mutation(api.items.sell, {
    itemId,
    soldOn: "2026-10-01",
    salePrice: 21000,
    saleNote: " Oslo coin fair ",
  });

  const item = await ada.as.query(api.items.get, { itemId });
  expect(item).toMatchObject({
    soldOn: "2026-10-01",
    salePrice: 21000,
    saleNote: "Oslo coin fair",
    quantity: 2,
    purchasePrice: 15000,
  });
});

const browse = async (who: Person, view: { status?: "sold" } = {}) => {
  const result = await who.as.query(api.collection.browse, {
    view,
    page: 1,
    pageSize: 25,
  });
  return {
    titles: result.items.map((item) => item.title),
    statuses: result.options.statuses,
    collectionSize: result.collectionSize,
  };
};

test("the Collection shows owned Items by default and the sold view only sold ones", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addKrone(ada, "Kept krone");
  const sold = await addKrone(ada, "Sold krone");
  await ada.as.mutation(api.items.sell, { itemId: sold, soldOn: "2026-10-01" });

  expect(await browse(ada)).toEqual({
    titles: ["Kept krone"],
    statuses: { owned: 1, sold: 1 },
    collectionSize: 2,
  });
  expect(await browse(ada, { status: "sold" })).toEqual({
    titles: ["Sold krone"],
    statuses: { owned: 1, sold: 1 },
    collectionSize: 2,
  });
});

test("marking a sold Item owned removes its sale and returns it to the default view", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await addKrone(ada);
  await ada.as.mutation(api.items.sell, {
    itemId,
    soldOn: "2026-10-01",
    salePrice: 21000,
    saleNote: "Oslo coin fair",
  });

  await ada.as.mutation(api.items.markOwned, { itemId });

  const item = await ada.as.query(api.items.get, { itemId });
  expect(item?.soldOn).toBeUndefined();
  expect(item?.salePrice).toBeUndefined();
  expect(item?.saleNote).toBeUndefined();
  expect((await browse(ada)).titles).toEqual(["1 krone 1875"]);
});

/** Fills a Collection with `count` owned Items, as if added over time. */
async function collectionOf(t: Test, ownerId: Id<"users">, count: number) {
  return await t.run(async (ctx) => {
    const ids: Id<"items">[] = [];
    for (let n = 1; n <= count; n++)
      ids.push(
        await ctx.db.insert("items", {
          ownerId,
          type: "coin",
          title: `Krone ${n}`,
          quantity: 1,
        }),
      );
    return ids;
  });
}

test("the Free plan counts owned Items only: selling one frees room, marking it owned uses it again", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const [first] = await collectionOf(t, ada.userId, 50);
  const usage = async () =>
    (await ada.as.query(api.plans.usage, {})) as { used: number };
  await expect(addKrone(ada)).rejects.toThrow("ITEM_LIMIT_REACHED");

  await ada.as.mutation(api.items.sell, {
    itemId: first,
    soldOn: "2026-10-01",
  });
  expect((await usage()).used).toBe(49);
  const added = await addKrone(ada);
  expect((await usage()).used).toBe(50);

  // No room left to take the sold Item back.
  await expect(
    ada.as.mutation(api.items.markOwned, { itemId: first }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  await ada.as.mutation(api.items.remove, { itemId: added });
  await ada.as.mutation(api.items.markOwned, { itemId: first });
  expect((await usage()).used).toBe(50);
});

test("changing the Home currency converts sale prices at the confirmed rate", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  // Ten kroner and 0.80 euro to the dollar: one krone is 0.08 euro.
  await t.mutation(internal.spotPrices.record, {
    quotedAt: Date.now(),
    perDollar: {
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
    },
  });
  const itemId = await addKrone(ada);
  await ada.as.mutation(api.items.sell, {
    itemId,
    soldOn: "2026-10-01",
    salePrice: 21000,
  });

  await ada.as.mutation(api.homeCurrency.change, {
    homeCurrency: "EUR",
    rate: 0.08,
  });

  const item = await ada.as.query(api.items.get, { itemId });
  expect([item?.currency, item?.purchasePrice, item?.salePrice]).toEqual([
    "EUR",
    1200,
    1680,
  ]);
});

test("the CSV export covers the view shown: owned Items by default, sold ones in the sold view", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId: ada.userId,
      polarId: "sub_ada",
      polarCustomerId: "cus_ada",
      productId: "prod_premium_monthly",
      status: "active",
      interval: "month",
      currency: "NOK",
      amount: 3900,
      cancelAtPeriodEnd: false,
      modifiedAt: Date.now(),
      premium: true,
    }),
  );
  await addKrone(ada, "Kept krone");
  const sold = await addKrone(ada, "Sold krone");
  await ada.as.mutation(api.items.sell, { itemId: sold, soldOn: "2026-10-01" });
  const exported = (view: { status?: "sold" }) =>
    ada.as.query(api.collection.exports.csv, { view, locale: "en" });

  const owned = await exported({});
  expect(owned).toContain("Kept krone");
  expect(owned).not.toContain("Sold krone");
  const soldView = await exported({ status: "sold" });
  expect(soldView).toContain("Sold krone");
  expect(soldView).not.toContain("Kept krone");
});

test("a sold Item can be deleted like any other", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await addKrone(ada);
  await ada.as.mutation(api.items.sell, { itemId, soldOn: "2026-10-01" });

  await ada.as.mutation(api.items.remove, { itemId });

  expect(await ada.as.query(api.items.get, { itemId })).toBeNull();
  expect((await browse(ada, { status: "sold" })).titles).toEqual([]);
});

test("a sale needs a real sold-on date no later than today, and a whole, non-negative price", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await addKrone(ada);
  const sell = (sale: { soldOn: string; salePrice?: number }) =>
    ada.as.mutation(api.items.sell, { itemId, ...sale });

  await expect(sell({ soldOn: "" })).rejects.toThrow("INVALID_DATE");
  await expect(sell({ soldOn: "2026-02-30" })).rejects.toThrow("INVALID_DATE");
  await expect(sell({ soldOn: "2999-01-01" })).rejects.toThrow("INVALID_DATE");
  await expect(sell({ soldOn: "2026-10-01", salePrice: -1 })).rejects.toThrow(
    "INVALID_AMOUNT",
  );
  await expect(sell({ soldOn: "2026-10-01", salePrice: 1.5 })).rejects.toThrow(
    "INVALID_AMOUNT",
  );
  expect((await browse(ada)).titles).toEqual(["1 krone 1875"]);
});

test("nobody can sell, or take back, someone else's Item", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const itemId = await addKrone(ada);

  await expect(
    bob.as.mutation(api.items.sell, { itemId, soldOn: "2026-10-01" }),
  ).rejects.toThrow("ITEM_NOT_FOUND");
  await ada.as.mutation(api.items.sell, { itemId, soldOn: "2026-10-01" });
  await expect(
    bob.as.mutation(api.items.markOwned, { itemId }),
  ).rejects.toThrow("ITEM_NOT_FOUND");
  expect((await ada.as.query(api.items.get, { itemId }))?.soldOn).toBe(
    "2026-10-01",
  );
});

test("editing a sold Item keeps its sale", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await addKrone(ada);
  await ada.as.mutation(api.items.sell, {
    itemId,
    soldOn: "2026-10-01",
    salePrice: 21000,
  });

  await ada.as.mutation(api.items.update, {
    itemId,
    type: "coin",
    title: "1 krone 1876",
  });

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    title: "1 krone 1876",
    soldOn: "2026-10-01",
    salePrice: 21000,
  });
});

test("an Item can't be sold before the day it was bought", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "1 krone 1875",
    purchaseDate: "2026-09-01",
  });

  await expect(
    ada.as.mutation(api.items.sell, { itemId, soldOn: "2026-08-31" }),
  ).rejects.toThrow("SOLD_BEFORE_PURCHASE");
  await ada.as.mutation(api.items.sell, { itemId, soldOn: "2026-09-01" });
});
