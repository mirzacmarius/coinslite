/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { albumDeleteBatch } from "./albums";
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

const krone = { type: "coin" as const, title: "1 krone 1875" };

/** The titles of an Album's Items, newest first. */
async function titlesIn(
  as: Awaited<ReturnType<typeof person>>["as"],
  albumId: Id<"albums">,
) {
  const { page } = await as.query(api.albums.items, {
    albumId,
    paginationOpts: firstPage,
  });
  return page.map((item) => item.title);
}

/** Each Album's name and Item count, as the Albums list shows them. */
async function counts(as: Awaited<ReturnType<typeof person>>["as"]) {
  const albums = await as.query(api.albums.list, {});
  return Object.fromEntries(
    albums.map((album) => [album.name, album.itemCount]),
  );
}

test("a new Album is stored tidy and listed with no Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const albumId = await ada.as.mutation(api.albums.create, {
    name: "  Travel ",
    description: " Coins from trips abroad  ",
    colour: "blue",
  });

  expect(await ada.as.query(api.albums.list, {})).toMatchObject([
    {
      _id: albumId,
      name: "Travel",
      description: "Coins from trips abroad",
      colour: "blue",
      itemCount: 0,
    },
  ]);
});

test("an Album needs a name of at most 80 characters and a description of at most 300", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await expect(
    ada.as.mutation(api.albums.create, { name: "   ", colour: "red" }),
  ).rejects.toThrow("NAME_REQUIRED");
  await expect(
    ada.as.mutation(api.albums.create, { name: "x".repeat(81), colour: "red" }),
  ).rejects.toThrow("TOO_LONG");
  await expect(
    ada.as.mutation(api.albums.create, {
      name: "Travel",
      description: "x".repeat(301),
      colour: "red",
    }),
  ).rejects.toThrow("TOO_LONG");

  await ada.as.mutation(api.albums.create, {
    name: "x".repeat(80),
    description: "y".repeat(300),
    colour: "red",
  });
  await ada.as.mutation(api.albums.create, {
    name: "Bullion",
    description: "   ",
    colour: "yellow",
  });
  const albums = await ada.as.query(api.albums.list, {});
  expect(albums).toHaveLength(2);
  expect(albums[1]).not.toHaveProperty("description");
});

test("an Album created by name alone gets a palette colour no other Album uses", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await ada.as.mutation(api.albums.create, { name: "Travel", colour: "grey" });
  await ada.as.mutation(api.albums.create, { name: "Norway", colour: "red" });

  const albumId = await ada.as.mutation(api.albums.create, { name: "Gold" });

  expect(await ada.as.query(api.albums.get, { albumId })).toMatchObject({
    colour: "orange",
  });
});

test("an Album's colour comes from the fixed palette", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  await expect(
    ada.as.mutation(api.albums.create, {
      name: "Travel",
      // @ts-expect-error not a palette colour
      colour: "#ff0000",
    }),
  ).rejects.toThrow();
});

test("editing an Album changes its name, description and colour", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    description: "Trips",
    colour: "blue",
  });

  await ada.as.mutation(api.albums.update, {
    albumId,
    name: " Holidays ",
    colour: "green",
  });

  const album = await ada.as.query(api.albums.get, { albumId });
  expect(album).toMatchObject({
    name: "Holidays",
    colour: "green",
    itemCount: 0,
  });
  expect(album).not.toHaveProperty("description");
  await expect(
    ada.as.mutation(api.albums.update, { albumId, name: "", colour: "green" }),
  ).rejects.toThrow("NAME_REQUIRED");
});

test("only the owner sees and changes an Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });

  await ada.as.mutation(api.items.add, { ...krone, albumId });

  expect(await bo.as.query(api.albums.list, {})).toEqual([]);
  expect(await bo.as.query(api.albums.get, { albumId })).toBeNull();
  expect(await titlesIn(bo.as, albumId)).toEqual([]);
  expect(
    await ada.as.query(api.albums.get, { albumId: "not-an-id" }),
  ).toBeNull();
  await expect(
    bo.as.mutation(api.albums.update, {
      albumId,
      name: "Mine now",
      colour: "red",
    }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  expect(await ada.as.query(api.albums.get, { albumId })).toMatchObject({
    name: "Travel",
  });
});

test("Albums need a signed-in person who has finished signing up", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  await expect(t.query(api.albums.list, {})).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    t.mutation(api.albums.create, { name: "Travel", colour: "blue" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(newcomer.as.query(api.albums.list, {})).rejects.toThrow(
    "NOT_SET_UP",
  );
  await expect(
    newcomer.as.mutation(api.albums.create, { name: "Travel", colour: "blue" }),
  ).rejects.toThrow("NOT_SET_UP");
});

test("an Item put in an Album on the Item form is listed in it and counted", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });

  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });
  await ada.as.mutation(api.items.add, { type: "stamp", title: "Posthorn" });

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    albumId: travel,
  });
  expect(await titlesIn(ada.as, travel)).toEqual(["1 krone 1875"]);
  expect(await counts(ada.as)).toEqual({ Travel: 1 });
});

test("an Item is in at most one Album: picking another moves it there", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const norway = await ada.as.mutation(api.albums.create, {
    name: "Norway",
    colour: "red",
  });
  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });

  await ada.as.mutation(api.items.update, {
    itemId,
    ...krone,
    albumId: norway,
  });

  expect(await titlesIn(ada.as, travel)).toEqual([]);
  expect(await titlesIn(ada.as, norway)).toEqual(["1 krone 1875"]);
  expect(await counts(ada.as)).toEqual({ Travel: 0, Norway: 1 });

  // Saving the form without an Album takes the Item out of it.
  await ada.as.mutation(api.items.update, { itemId, ...krone });

  expect(await titlesIn(ada.as, norway)).toEqual([]);
  expect(await counts(ada.as)).toEqual({ Travel: 0, Norway: 0 });
  expect(await ada.as.query(api.items.get, { itemId })).not.toHaveProperty(
    "albumId",
  );
});

test("an Item can't go into someone else's Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  const adasAlbum = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const bosItem = await bo.as.mutation(api.items.add, krone);

  await expect(
    bo.as.mutation(api.items.add, { ...krone, albumId: adasAlbum }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  await expect(
    bo.as.mutation(api.items.update, {
      itemId: bosItem,
      ...krone,
      albumId: adasAlbum,
    }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  expect(await titlesIn(bo.as, adasAlbum)).toEqual([]);
  expect(await counts(ada.as)).toEqual({ Travel: 0 });
});

test("a duplicated Item joins the same Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });

  const copyId = await ada.as.mutation(api.items.duplicate, { itemId });

  expect(await ada.as.query(api.items.get, { itemId: copyId })).toMatchObject({
    albumId: travel,
  });
  expect(await counts(ada.as)).toEqual({ Travel: 2 });
});

test("deleting an Album deletes the ticked Items and keeps the rest without an Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const norway = await ada.as.mutation(api.albums.create, {
    name: "Norway",
    colour: "red",
  });
  const add = (title: string, albumId?: Id<"albums">) =>
    ada.as.mutation(api.items.add, { type: "coin", title, albumId });
  const sold = await add("Sold dollar", travel);
  const kept = await add("Kept franc", travel);
  const alsoSold = await add("Sold peseta", travel);
  await add("2 kroner 1914", norway);
  await add("Loose stamp");

  await ada.as.mutation(api.albums.remove, {
    albumId: travel,
    deleteItemIds: [sold, alsoSold],
  });

  expect(await ada.as.query(api.albums.get, { albumId: travel })).toBeNull();
  expect(await counts(ada.as)).toEqual({ Norway: 1 });
  expect(await ada.as.query(api.items.get, { itemId: sold })).toBeNull();
  expect(await ada.as.query(api.items.get, { itemId: alsoSold })).toBeNull();
  const keptItem = await ada.as.query(api.items.get, { itemId: kept });
  expect(keptItem).toMatchObject({ title: "Kept franc" });
  expect(keptItem).not.toHaveProperty("albumId");
  const { page } = await ada.as.query(api.items.list, {
    paginationOpts: firstPage,
  });
  expect(page.map((item) => item.title).sort()).toEqual([
    "2 kroner 1914",
    "Kept franc",
    "Loose stamp",
  ]);
  expect(await titlesIn(ada.as, norway)).toEqual(["2 kroner 1914"]);
});

test("deleting an Album with nothing ticked keeps all its Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });

  await ada.as.mutation(api.albums.remove, {
    albumId: travel,
    deleteItemIds: [],
  });

  expect(await ada.as.query(api.albums.list, {})).toEqual([]);
  expect(await ada.as.query(api.items.get, { itemId })).not.toHaveProperty(
    "albumId",
  );
});

test("only the Album's own Items can be deleted along with it", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const norway = await ada.as.mutation(api.albums.create, {
    name: "Norway",
    colour: "red",
  });
  const inTravel = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });
  const inNorway = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: norway,
  });
  const bosItem = await bo.as.mutation(api.items.add, krone);

  for (const other of [inNorway, bosItem]) {
    await expect(
      ada.as.mutation(api.albums.remove, {
        albumId: travel,
        deleteItemIds: [inTravel, other],
      }),
    ).rejects.toThrow("ITEM_NOT_FOUND");
  }

  // Nothing was deleted.
  expect(await counts(ada.as)).toEqual({ Travel: 1, Norway: 1 });
  expect(
    await ada.as.query(api.items.get, { itemId: inTravel }),
  ).not.toBeNull();
  expect(await bo.as.query(api.items.get, { itemId: bosItem })).not.toBeNull();
});

test("only the owner deletes an Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });

  await expect(
    bo.as.mutation(api.albums.remove, {
      albumId: travel,
      deleteItemIds: [itemId],
    }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  expect(await counts(ada.as)).toEqual({ Travel: 1 });
});

test("a large Album lets go of all its Items, a batch at a time", async () => {
  vi.useFakeTimers();
  try {
    const t = newTest();
    const ada = await person(t, "ada@example.com");
    const travel = await ada.as.mutation(api.albums.create, {
      name: "Travel",
      colour: "blue",
    });
    const total = 450;
    await t.run(async (ctx) => {
      for (let n = 0; n < total; n++)
        await ctx.db.insert("items", {
          ownerId: ada.userId,
          type: "coin",
          title: `Coin ${n}`,
          quantity: 1,
          albumId: travel,
        });
      await ctx.db.patch(travel, { itemCount: total });
    });

    await ada.as.mutation(api.albums.remove, {
      albumId: travel,
      deleteItemIds: [],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const stillInAlbum = await t.run((ctx) =>
      ctx.db
        .query("items")
        .withIndex("by_ownerId_and_albumId", (q) =>
          q.eq("ownerId", ada.userId).eq("albumId", travel),
        )
        .take(total),
    );
    expect(stillInAlbum).toEqual([]);
    const items = await t.run((ctx) =>
      ctx.db
        .query("items")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", ada.userId))
        .take(total + 1),
    );
    expect(items).toHaveLength(total);
  } finally {
    vi.useRealTimers();
  }
});

test("an account holds up to 500 Albums", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n < 499; n++)
      await ctx.db.insert("albums", {
        ownerId: ada.userId,
        name: `Album ${n}`,
        colour: "grey",
        itemCount: 0,
      });
  });

  await ada.as.mutation(api.albums.create, { name: "Last", colour: "red" });

  await expect(
    ada.as.mutation(api.albums.create, { name: "One more", colour: "red" }),
  ).rejects.toThrow("TOO_MANY_ALBUMS");
  expect(await ada.as.query(api.albums.list, {})).toHaveLength(500);
});

/** A JPEG put in storage the way the browser uploads one, then attached. */
async function addPhoto(
  t: Test,
  who: Awaited<ReturnType<typeof person>>,
  itemId: Id<"items">,
  side: "front" | "back",
) {
  const jpeg = new Uint8Array(64);
  jpeg.set([0xff, 0xd8, 0xff, 0xe0, side === "front" ? 1 : 2]);
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([jpeg])));
  await who.as.action(api.photos.attach, { itemId, side, storageId });
}

test("many ticked Items go with their Album a batch at a time; the rest stay, without an Album", async () => {
  vi.useFakeTimers();
  try {
    const t = newTest();
    const ada = await person(t, "ada@example.com");
    const travel = await ada.as.mutation(api.albums.create, {
      name: "Travel",
      colour: "blue",
    });
    const ticked = albumDeleteBatch * 2 + 10;
    const kept = 15;
    const ids = await t.run(async (ctx) => {
      const ids = [];
      for (let n = 0; n < ticked + kept; n++)
        ids.push(
          await ctx.db.insert("items", {
            ownerId: ada.userId,
            type: "coin",
            title: `Coin ${n}`,
            quantity: 1,
            albumId: travel,
          }),
        );
      await ctx.db.patch(travel, { itemCount: ticked + kept });
      return ids;
    });
    const count = () =>
      t.run(
        async (ctx) =>
          (
            await ctx.db
              .query("items")
              .withIndex("by_ownerId", (q) => q.eq("ownerId", ada.userId))
              .collect()
          ).length,
      );

    await ada.as.mutation(api.albums.remove, {
      albumId: travel,
      deleteItemIds: ids.slice(0, ticked),
    });
    // The first batch goes at once; the Album is gone from the list.
    expect(await count()).toBe(ticked + kept - albumDeleteBatch);
    expect(await ada.as.query(api.albums.list, {})).toEqual([]);

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const left = await t.run((ctx) =>
      ctx.db
        .query("items")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", ada.userId))
        .collect(),
    );
    expect(left.map((item) => item._id).sort()).toEqual(
      ids.slice(ticked).sort(),
    );
    expect(left.every((item) => item.albumId === undefined)).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

test("Items deleted with their Album take their stored photos with them", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const sold = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Sold dollar",
    albumId: travel,
  });
  const kept = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Kept franc",
    albumId: travel,
  });
  await addPhoto(t, ada, sold, "front");
  await addPhoto(t, ada, sold, "back");
  await addPhoto(t, ada, kept, "front");

  await ada.as.mutation(api.albums.remove, {
    albumId: travel,
    deleteItemIds: [sold],
  });

  const storedFiles = await t.run(
    async (ctx) => (await ctx.db.system.query("_storage").collect()).length,
  );
  expect(storedFiles).toBe(1);
  expect(await ada.as.query(api.photos.ofItem, { itemId: kept })).toEqual({
    front: expect.any(String),
    back: null,
  });
});

test("deleting an Item takes it out of its Album's count", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const itemId = await ada.as.mutation(api.items.add, {
    ...krone,
    albumId: travel,
  });
  await ada.as.mutation(api.items.add, { ...krone, albumId: travel });

  await ada.as.mutation(api.items.remove, { itemId });

  expect(await counts(ada.as)).toEqual({ Travel: 1 });
});

test("an Album lists its Items with their thumbnails, like the Collection", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const withPhoto = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "With photo",
    albumId: travel,
  });
  await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Without",
    albumId: travel,
  });
  await addPhoto(t, ada, withPhoto, "back");

  const { page } = await ada.as.query(api.albums.items, {
    albumId: travel,
    paginationOpts: firstPage,
  });

  const photos = await ada.as.query(api.photos.ofItem, { itemId: withPhoto });
  expect(
    Object.fromEntries(page.map((item) => [item.title, item.thumbnailUrl])),
  ).toEqual({ "With photo": photos?.back, Without: null });
});
