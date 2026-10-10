/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { collectionCountsOf } from "./collectionCounts";
import { deleteItem } from "./items/deletion";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

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

const countsOf = (t: Test, userId: Id<"users">) =>
  t.run((ctx) => collectionCountsOf(ctx, userId));

/** Whether the person's counts are stored, rather than counted when asked. */
const stored = (t: Test, userId: Id<"users">) =>
  t.run(
    async (ctx) =>
      (await ctx.db
        .query("collectionCounts")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique()) !== null,
  );

const krone = { type: "coin" as const, title: "1 krone 1875" };
const note = { type: "banknote" as const, title: "100 kroner 1949" };
const stamp = { type: "stamp" as const, title: "Posthorn 1872" };

test("adding Items counts them, by Item type", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  expect(await countsOf(t, ada.userId)).toEqual({
    items: 0,
    coins: 0,
    banknotes: 0,
    stamps: 0,
    albums: 0,
  });

  await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.items.add, note);
  await ada.as.mutation(api.items.add, stamp);
  await ada.as.mutation(api.items.add, krone);

  expect(await countsOf(t, ada.userId)).toEqual({
    items: 4,
    coins: 2,
    banknotes: 1,
    stamps: 1,
    albums: 0,
  });
  expect(await stored(t, ada.userId)).toBe(true);
});

test("an Item that fails to save isn't counted", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await ada.as.mutation(api.items.add, krone);

  await expect(
    ada.as.mutation(api.items.add, { type: "coin", title: " " }),
  ).rejects.toThrow("TITLE_REQUIRED");

  expect(await countsOf(t, ada.userId)).toMatchObject({ items: 1, coins: 1 });
});

test("changing an Item's type moves it from one type's count to the other's", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, krone);

  await ada.as.mutation(api.items.update, { itemId, ...note });
  expect(await countsOf(t, ada.userId)).toMatchObject({
    items: 1,
    coins: 0,
    banknotes: 1,
  });

  // Saving the form without changing the type changes nothing.
  await ada.as.mutation(api.items.update, {
    itemId,
    ...note,
    title: "100 kroner",
  });
  expect(await countsOf(t, ada.userId)).toMatchObject({
    items: 1,
    coins: 0,
    banknotes: 1,
  });
});

test("deleting an Item takes it off the counts", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const kroneId = await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.items.add, stamp);

  await ada.as.mutation(api.items.remove, { itemId: kroneId });

  expect(await countsOf(t, ada.userId)).toEqual({
    items: 1,
    coins: 0,
    banknotes: 0,
    stamps: 1,
    albums: 0,
  });
});

test("creating Albums counts them; deleting one takes it, and the Items ticked with it, off", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, { name: "Travel" });
  await ada.as.mutation(api.albums.create, { name: "Norway" });
  const kept = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });
  const ticked = await ada.as.mutation(api.items.add, {
    ...note,
    albumId: travel,
  });
  expect(await countsOf(t, ada.userId)).toMatchObject({
    items: 2,
    albums: 2,
  });

  await ada.as.mutation(api.albums.remove, {
    albumId: travel,
    deleteItemIds: [ticked],
  });

  expect(await countsOf(t, ada.userId)).toEqual({
    items: 1,
    coins: 1,
    banknotes: 0,
    stamps: 0,
    albums: 1,
  });
  expect(await ada.as.query(api.items.get, { itemId: kept })).not.toBeNull();
});

test("each person's counts are their own", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");

  await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.albums.create, { name: "Travel" });
  await bob.as.mutation(api.items.add, stamp);

  expect(await countsOf(t, ada.userId)).toMatchObject({
    items: 1,
    coins: 1,
    stamps: 0,
    albums: 1,
  });
  expect(await countsOf(t, bob.userId)).toMatchObject({
    items: 1,
    coins: 0,
    stamps: 1,
    albums: 0,
  });
});

test("a Collection from before counting began is counted when first needed, then kept", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const [oldKrone] = await t.run(async (ctx) => [
    await ctx.db.insert("items", {
      ownerId: ada.userId,
      ...krone,
      quantity: 1,
    }),
    await ctx.db.insert("items", { ownerId: ada.userId, ...note, quantity: 3 }),
    await ctx.db.insert("items", { ownerId: ada.userId, ...note, quantity: 1 }),
    await ctx.db.insert("albums", {
      ownerId: ada.userId,
      name: "Travel",
      colour: "blue",
      itemCount: 0,
    }),
  ]);

  // Read without storing anything.
  expect(await countsOf(t, ada.userId)).toEqual({
    items: 3,
    coins: 1,
    banknotes: 2,
    stamps: 0,
    albums: 1,
  });
  expect(await stored(t, ada.userId)).toBe(false);

  // A deletion before then leaves it to the count.
  await ada.as.mutation(api.items.remove, { itemId: oldKrone as Id<"items"> });
  expect(await stored(t, ada.userId)).toBe(false);

  // The first addition counts what's there, itself included.
  await ada.as.mutation(api.items.add, stamp);
  expect(await stored(t, ada.userId)).toBe(true);
  expect(await countsOf(t, ada.userId)).toEqual({
    items: 3,
    coins: 0,
    banknotes: 2,
    stamps: 1,
    albums: 1,
  });
});

test("deleting an account deletes its counts, and clearing up its Collection doesn't bring them back", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.albums.create, { name: "Travel" });
  expect(await stored(t, ada.userId)).toBe(true);

  await ada.as.action(api.account.deletion.deleteAccount, {});
  expect(await stored(t, ada.userId)).toBe(false);

  // The Collection goes through the one way Items are deleted, possibly later.
  await t.run(async (ctx) => {
    const item = await ctx.db.get(itemId);
    if (item) await deleteItem(ctx, item);
  });
  expect(await stored(t, ada.userId)).toBe(false);
});
