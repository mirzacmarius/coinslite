/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
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

type Signed = Awaited<ReturnType<typeof person>>["as"];
type ItemArgs = FunctionArgs<typeof api.items.add>;

const add = (as: Signed, item: Partial<ItemArgs> = {}) =>
  as.mutation(api.items.add, { type: "coin", title: "Krone", ...item });

test("the Overview shows the three most recently added Items, newest first, with year and denomination", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada.as, { title: "Oldest" });
  await add(ada.as, { title: "2 øre 1918", year: 1918, denomination: "2 øre" });
  await add(ada.as, {
    type: "banknote",
    title: "100 kroner 1977",
    year: 1977,
    denomination: "100 kroner",
  });
  await add(ada.as, { type: "stamp", title: "Posthorn" });

  const latest = await ada.as.query(api.overview.latestItems, {});

  expect(latest).toEqual([
    {
      _id: expect.any(String),
      type: "stamp",
      title: "Posthorn",
      thumbnailUrl: null,
    },
    {
      _id: expect.any(String),
      type: "banknote",
      title: "100 kroner 1977",
      year: 1977,
      denomination: "100 kroner",
      thumbnailUrl: null,
    },
    {
      _id: expect.any(String),
      type: "coin",
      title: "2 øre 1918",
      year: 1918,
      denomination: "2 øre",
      thumbnailUrl: null,
    },
  ]);
});

/** A JPEG as the browser uploads it: its first bytes, padded like a real file. */
const uploadPhoto = (t: Test) => {
  const bytes = new Uint8Array(2048);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
  bytes.set(new TextEncoder().encode("JFIF"), 6);
  return t.run((ctx) => ctx.storage.store(new Blob([bytes])));
};

test("each latest Item shows its photo as a thumbnail", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await add(ada.as, { title: "Krone" });
  await ada.as.action(api.photos.attach, {
    itemId,
    side: "back",
    storageId: await uploadPhoto(t),
  });

  const [latest] = await ada.as.query(api.overview.latestItems, {});

  const photos = await ada.as.query(api.photos.ofItem, { itemId });
  expect(latest?.thumbnailUrl).toEqual(expect.any(String));
  expect(latest?.thumbnailUrl).toBe(photos?.back);
});

test("an empty Collection has no latest Items, and nobody sees anyone else's", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  await add(bob.as, { title: "Bob's krone" });

  expect(await ada.as.query(api.overview.latestItems, {})).toEqual([]);
  expect(
    (await bob.as.query(api.overview.latestItems, {})).map(
      (item) => item.title,
    ),
  ).toEqual(["Bob's krone"]);
});

test("a deleted Item leaves the latest, and the one before it takes its place", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  for (const title of ["First", "Second", "Third"])
    await add(ada.as, { title });
  const fourth = await add(ada.as, { title: "Fourth" });

  await ada.as.mutation(api.items.remove, { itemId: fourth });

  expect(
    (await ada.as.query(api.overview.latestItems, {})).map(
      (item) => item.title,
    ),
  ).toEqual(["Third", "Second", "First"]);
});

test("the latest Items need a signed-in person who has finished signing up", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  await expect(t.query(api.overview.latestItems, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(newcomer.as.query(api.overview.latestItems, {})).rejects.toThrow(
    "NOT_SET_UP",
  );
});
