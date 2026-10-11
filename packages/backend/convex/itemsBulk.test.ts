/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { itemNotFound } from "./items";
import { bulkErrors, bulkLimits } from "./items/bulkRules";
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

type As = Awaited<ReturnType<typeof person>>["as"];

const coin = (title: string) => ({ type: "coin" as const, title });

/** Each Album's name and Item count, as the Albums list shows them. */
async function counts(as: As) {
  const albums = await as.query(api.albums.list, {});
  return Object.fromEntries(
    albums.map((album) => [album.name, album.itemCount]),
  );
}

test("moving several Items fills one Album and empties the other", async () => {
  const t = newTest();
  const { as } = await person(t, "ada@example.com");
  const silver = await as.mutation(api.albums.create, { name: "Silver" });
  const gold = await as.mutation(api.albums.create, { name: "Gold" });
  const one = await as.mutation(api.items.add, {
    ...coin("1 krone 1875"),
    albumId: silver,
  });
  const two = await as.mutation(api.items.add, {
    ...coin("2 kroner 1878"),
    albumId: silver,
  });
  const loose = await as.mutation(api.items.add, coin("10 øre 1920"));

  await as.mutation(api.items.moveToAlbum, {
    itemIds: [one, two, loose],
    albumId: gold,
  });
  expect(await counts(as)).toEqual({ Silver: 0, Gold: 3 });

  // Moving again into the same Album changes nothing.
  await as.mutation(api.items.moveToAlbum, { itemIds: [one], albumId: gold });
  expect(await counts(as)).toEqual({ Silver: 0, Gold: 3 });

  // No Album takes them out.
  await as.mutation(api.items.moveToAlbum, { itemIds: [one, two] });
  expect(await counts(as)).toEqual({ Silver: 0, Gold: 1 });
  const item = await as.query(api.items.get, { itemId: one });
  expect(item?.albumId).toBeUndefined();
});

test("one Item that isn't yours stops the whole move", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const album = await ada.as.mutation(api.albums.create, { name: "Silver" });
  const mine = await ada.as.mutation(api.items.add, coin("1 krone 1875"));
  const theirs = await bob.as.mutation(api.items.add, coin("2 kroner 1878"));

  await expect(
    ada.as.mutation(api.items.moveToAlbum, {
      itemIds: [mine, theirs],
      albumId: album,
    }),
  ).rejects.toThrow(itemNotFound);
  expect(await counts(ada.as)).toEqual({ Silver: 0 });
  const item = await ada.as.query(api.items.get, { itemId: mine });
  expect(item?.albumId).toBeUndefined();
});

test("someone else's Album can't be moved into", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const theirs = await bob.as.mutation(api.albums.create, { name: "Bob's" });
  const mine = await ada.as.mutation(api.items.add, coin("1 krone 1875"));

  await expect(
    ada.as.mutation(api.items.moveToAlbum, {
      itemIds: [mine],
      albumId: theirs,
    }),
  ).rejects.toThrow();
  expect(await counts(bob.as)).toEqual({ "Bob's": 0 });
});

test(`at most ${bulkLimits.items} Items move at once`, async () => {
  const t = newTest();
  const { as } = await person(t, "ada@example.com");
  const item = await as.mutation(api.items.add, coin("1 krone 1875"));
  const ids = Array.from({ length: bulkLimits.items + 1 }, () => item);
  // The same Item twice counts once…
  await as.mutation(api.items.moveToAlbum, { itemIds: ids });
  // …but more distinct Items than the limit are refused.
  const many = await t.run(async (ctx) => {
    const owner = (await ctx.db.query("users").first())?._id;
    if (!owner) throw new Error("no owner");
    return Promise.all(
      Array.from({ length: bulkLimits.items + 1 }, (_, index) =>
        ctx.db.insert("items", {
          ownerId: owner,
          type: "coin",
          title: `Coin ${index}`,
          quantity: 1,
        }),
      ),
    );
  });
  await expect(
    as.mutation(api.items.moveToAlbum, { itemIds: many }),
  ).rejects.toThrow(bulkErrors.tooManyItems);
});

test("the view's Items can be selected up to the limit, with their Albums", async () => {
  const t = newTest();
  const { as } = await person(t, "ada@example.com");
  const album = await as.mutation(api.albums.create, { name: "Silver" });
  const inAlbum = await as.mutation(api.items.add, {
    ...coin("1 krone 1875"),
    albumId: album,
  });
  const loose = await as.mutation(api.items.add, coin("2 kroner 1878"));
  await as.mutation(api.items.add, {
    type: "stamp",
    title: "Posthorn 1872",
  });

  const coins = await as.query(api.collection.selectable, {
    view: { type: "coin" },
  });
  expect(coins.total).toBe(2);
  expect(coins.items).toEqual(
    expect.arrayContaining([
      { _id: inAlbum, albumId: album },
      { _id: loose, albumId: null },
    ]),
  );
});
