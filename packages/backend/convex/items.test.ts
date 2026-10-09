/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
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

const firstPage = { numItems: 20, cursor: null };

const morgan = {
  type: "coin" as const,
  title: "  Morgan dollar 1881-S ",
  country: "us",
  year: 1881,
  denomination: "1 dollar",
  quantity: 2,
  purchasePrice: 7500,
  marketValue: 9000,
  purchaseDate: "2024-05-01",
  source: "Coin fair",
  notes: "Toned reverse",
};

test("an added Item is stored tidy and shown with its owner's Home currency", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const itemId = await ada.as.mutation(api.items.add, morgan);

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    type: "coin",
    title: "Morgan dollar 1881-S",
    country: "US",
    year: 1881,
    denomination: "1 dollar",
    quantity: 2,
    purchasePrice: 7500,
    marketValue: 9000,
    purchaseDate: "2024-05-01",
    source: "Coin fair",
    notes: "Toned reverse",
    currency: "NOK",
  });
});

test("people only ever see their own Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const itemId = await ada.as.mutation(api.items.add, morgan);

  expect(
    (await bob.as.query(api.items.list, { paginationOpts: firstPage })).page,
  ).toEqual([]);
  expect(await bob.as.query(api.items.get, { itemId })).toBeNull();
  expect(
    (await ada.as.query(api.items.list, { paginationOpts: firstPage })).page,
  ).toHaveLength(1);
});

test("the Collection lists the newest Items first, a page at a time", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  for (const title of ["First", "Second", "Third"]) {
    await ada.as.mutation(api.items.add, { type: "coin", title });
  }

  const page = await ada.as.query(api.items.list, {
    paginationOpts: { numItems: 2, cursor: null },
  });

  expect(page.page.map(({ title }) => title)).toEqual(["Third", "Second"]);
  expect(page.isDone).toBe(false);
});

test("Quantity is a whole number of at least 1, and 1 when left out", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    quantity: 1,
  });

  for (const quantity of [0, -1, 1.5, 2_000_000]) {
    await expect(
      ada.as.mutation(api.items.add, {
        type: "coin",
        title: "Krone",
        quantity,
      }),
      String(quantity),
    ).rejects.toThrow("INVALID_QUANTITY");
  }
});

test("an Item needs a title", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await expect(
    ada.as.mutation(api.items.add, { type: "coin", title: "   " }),
  ).rejects.toThrow("TITLE_REQUIRED");
  await expect(
    ada.as.mutation(api.items.add, { type: "coin", title: "x".repeat(201) }),
  ).rejects.toThrow("TOO_LONG");
});

test("country, year, amounts and purchase date are checked", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const add = (fields: Record<string, unknown>) =>
    ada.as.mutation(api.items.add, { type: "coin", title: "Krone", ...fields });

  await expect(add({ country: "XX" })).rejects.toThrow("INVALID_COUNTRY");
  await expect(add({ year: 1881.5 })).rejects.toThrow("INVALID_YEAR");
  await expect(add({ year: new Date().getFullYear() + 3 })).rejects.toThrow(
    "INVALID_YEAR",
  );
  await expect(add({ purchasePrice: -1 })).rejects.toThrow("INVALID_AMOUNT");
  await expect(add({ marketValue: 12.5 })).rejects.toThrow("INVALID_AMOUNT");
  await expect(add({ purchaseDate: "2024-02-30" })).rejects.toThrow(
    "INVALID_DATE",
  );
  await expect(add({ purchaseDate: "2999-01-01" })).rejects.toThrow(
    "INVALID_DATE",
  );
  // Ancient coins are welcome.
  await expect(add({ year: -480 })).resolves.toEqual(expect.any(String));
});

test("signed-out callers, and people who haven't finished signing up, can't touch Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, morgan);
  const newcomer = await person(t, "new@example.com", { setUp: false });

  await expect(t.mutation(api.items.add, morgan)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    t.query(api.items.list, { paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(t.query(api.items.get, { itemId })).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(newcomer.as.mutation(api.items.add, morgan)).rejects.toThrow(
    "NOT_SET_UP",
  );
});

test("an id that isn't an Item finds nothing", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  expect(await ada.as.query(api.items.get, { itemId: "not-an-id" })).toBeNull();
  expect(
    await ada.as.query(api.items.get, { itemId: ada.userId as Id<"users"> }),
  ).toBeNull();
});
