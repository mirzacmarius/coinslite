/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const SITE = "https://coinslite-test.convex.site";
beforeEach(() => {
  vi.stubEnv("CONVEX_SITE_URL", SITE);
  vi.stubEnv("PHOTO_LINK_SECRET", "a-secret-only-the-backend-knows");
});

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

/** The first bytes of each accepted format, padded like a real file. */
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const images = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, ...ascii("JFIF")],
  png: [0x89, ...ascii("PNG\r\n\x1a\n"), 0, 0, 0, 0x0d, ...ascii("IHDR")],
  webp: [...ascii("RIFF"), 0x24, 0, 0, 0, ...ascii("WEBPVP8 ")],
  gif: ascii("GIF89a\x01\x00\x01\x00"),
};
const file = (head: number[], size = 2048) => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new Blob([bytes]);
};

/** What the browser does: put a file in storage through an upload URL. */
const upload = (t: Test, blob: Blob = file(images.jpeg)) =>
  t.run((ctx) => ctx.storage.store(blob));

const stored = (t: Test) =>
  t.run(
    async (ctx) => (await ctx.db.system.query("_storage").collect()).length,
  );

test("a front photo shows on its Item and as the Item's list thumbnail", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });

  const storageId = await upload(t);
  await ada.as.action(api.photos.attach, { itemId, side: "front", storageId });

  const photos = await ada.as.query(api.photos.ofItem, { itemId });
  expect(photos).toEqual({ front: expect.any(String), back: null });
  const { page } = await ada.as.query(api.items.list, {
    paginationOpts: firstPage,
  });
  expect(page[0]?.thumbnailUrl).toBe(photos?.front);
  expect(await stored(t)).toBe(1);
});

test("the list thumbnail is the front photo, else the back photo, else none", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const add = (title: string) =>
    ada.as.mutation(api.items.add, { type: "banknote", title });
  const both = await add("Both sides");
  const backOnly = await add("Back only");
  await add("No photos");
  const front = await upload(t, file(images.png));
  const back = await upload(t, file(images.gif));
  const onlyBack = await upload(t, file(images.webp));
  await ada.as.action(api.photos.attach, {
    itemId: both,
    side: "back",
    storageId: back,
  });
  await ada.as.action(api.photos.attach, {
    itemId: both,
    side: "front",
    storageId: front,
  });
  await ada.as.action(api.photos.attach, {
    itemId: backOnly,
    side: "back",
    storageId: onlyBack,
  });

  const { page } = await ada.as.query(api.items.list, {
    paginationOpts: firstPage,
  });
  const thumbnails = Object.fromEntries(
    page.map((item) => [item.title, item.thumbnailUrl]),
  );
  const photos = async (itemId: typeof both) =>
    (await ada.as.query(api.photos.ofItem, { itemId }))!;
  expect(thumbnails).toEqual({
    "Both sides": (await photos(both)).front,
    "Back only": (await photos(backOnly)).back,
    "No photos": null,
  });
});

test("only JPEG, PNG, WebP and GIF files are accepted, judged by their content", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const attach = (blob: Blob) =>
    upload(t, blob).then((storageId) =>
      ada.as.action(api.photos.attach, { itemId, side: "front", storageId }),
    );

  for (const head of Object.values(images)) {
    await expect(attach(file(head))).resolves.toBeNull();
  }
  for (const notAnImage of [
    // A web page named like a photo, still claiming to be one.
    new Blob(["<html><script>alert(1)</script></html>"], {
      type: "image/jpeg",
    }),
    file(ascii("%PDF-1.7")),
    file(ascii("RIFF\x24\x00\x00\x00WAVEfmt ")),
    file([0xff, 0xd8]),
    new Blob([]),
  ]) {
    await expect(attach(notAnImage)).rejects.toThrow("PHOTO_NOT_AN_IMAGE");
  }

  // Rejected uploads are thrown away; the last good photo stays.
  expect(await stored(t)).toBe(1);
  expect(await ada.as.query(api.photos.ofItem, { itemId })).toMatchObject({
    front: expect.any(String),
  });
});

test("photos can be up to 10 MB", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const attach = async (size: number) =>
    ada.as.action(api.photos.attach, {
      itemId,
      side: "back",
      storageId: await upload(t, file(images.jpeg, size)),
    });

  await expect(attach(10 * 1024 * 1024 + 1)).rejects.toThrow("PHOTO_TOO_LARGE");
  expect(await stored(t)).toBe(0);
  await expect(attach(10 * 1024 * 1024)).resolves.toBeNull();
  expect(await stored(t)).toBe(1);
});

test("each side can be replaced or removed on its own, and the old file goes", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const attach = async (side: "front" | "back", blob: Blob) =>
    ada.as.action(api.photos.attach, {
      itemId,
      side,
      storageId: await upload(t, blob),
    });
  const photos = async () =>
    (await ada.as.query(api.photos.ofItem, { itemId }))!;
  await attach("front", file(images.jpeg));
  await attach("back", file(images.png));
  const before = await photos();

  await attach("front", file(images.webp));
  const replaced = await photos();
  expect(replaced.front).not.toBe(before.front);
  expect(replaced.back).toBe(before.back);
  expect(await stored(t)).toBe(2);

  await ada.as.mutation(api.photos.remove, { itemId, side: "back" });
  expect(await photos()).toEqual({ front: replaced.front, back: null });
  expect(await stored(t)).toBe(1);

  // Removing a side that has no photo changes nothing.
  await ada.as.mutation(api.photos.remove, { itemId, side: "back" });
  expect(await photos()).toEqual({ front: replaced.front, back: null });
});

test("photos are private: nobody else sees, changes or takes over someone's photos", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const adasPhoto = await upload(t);
  await ada.as.action(api.photos.attach, {
    itemId,
    side: "front",
    storageId: adasPhoto,
  });
  const bobsItem = await bob.as.mutation(api.items.add, {
    type: "coin",
    title: "Mine",
  });

  expect(await bob.as.query(api.photos.ofItem, { itemId })).toBeNull();
  await expect(
    bob.as.action(api.photos.attach, {
      itemId,
      side: "front",
      storageId: await upload(t, file(images.png)),
    }),
  ).rejects.toThrow("ITEM_NOT_FOUND");
  await expect(
    bob.as.mutation(api.photos.remove, { itemId, side: "front" }),
  ).rejects.toThrow("ITEM_NOT_FOUND");
  // A file that's already someone's photo can't be put on another Item.
  for (const [who, target] of [
    [bob, bobsItem],
    [ada, itemId],
  ] as const) {
    await expect(
      who.as.action(api.photos.attach, {
        itemId: target,
        side: "back",
        storageId: adasPhoto,
      }),
    ).rejects.toThrow("PHOTO_NOT_FOUND");
  }

  expect(await bob.as.query(api.photos.ofItem, { itemId: bobsItem })).toEqual({
    front: null,
    back: null,
  });
  const adas = await ada.as.query(api.photos.ofItem, { itemId });
  expect(adas).toEqual({ front: expect.any(String), back: null });
  const { page } = await ada.as.query(api.items.list, {
    paginationOpts: firstPage,
  });
  expect(page[0]?.thumbnailUrl).toBe(adas?.front);
});

test("signed-out callers, and people who haven't finished signing up, get no photos", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const storageId = await upload(t);

  await expect(t.mutation(api.photos.generateUploadUrl, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    newcomer.as.mutation(api.photos.generateUploadUrl, {}),
  ).rejects.toThrow("NOT_SET_UP");
  await expect(
    t.action(api.photos.attach, { itemId, side: "front", storageId }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(t.query(api.photos.ofItem, { itemId })).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    t.mutation(api.photos.remove, { itemId, side: "front" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  expect(await ada.as.mutation(api.photos.generateUploadUrl, {})).toEqual(
    expect.stringMatching(/^https:\/\//),
  );
});

test("only a fresh upload becomes a photo; older stored files are left alone", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const storageId = await upload(t);

  vi.setSystemTime(Date.now() + 61 * 60 * 1000);
  await expect(
    ada.as.action(api.photos.attach, { itemId, side: "front", storageId }),
  ).rejects.toThrow("PHOTO_NOT_FOUND");
  expect(await stored(t)).toBe(1);
  expect(await ada.as.query(api.photos.ofItem, { itemId })).toEqual({
    front: null,
    back: null,
  });
});

test("an upload belongs to whoever registers it first: nobody else can use it or have it thrown away", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  const adasItem = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const bobsItem = await bob.as.mutation(api.items.add, {
    type: "coin",
    title: "Mine",
  });
  const photo = await upload(t);
  const notAnImage = await upload(t, file(ascii("%PDF-1.7")));
  for (const storageId of [photo, notAnImage])
    await ada.as.mutation(api.photos.register, { storageId });

  for (const storageId of [photo, notAnImage]) {
    await expect(
      bob.as.mutation(api.photos.register, { storageId }),
    ).rejects.toThrow("PHOTO_NOT_FOUND");
    await expect(
      bob.as.action(api.photos.attach, {
        itemId: bobsItem,
        side: "front",
        storageId,
      }),
    ).rejects.toThrow("PHOTO_NOT_FOUND");
  }
  // Bob's tries threw nothing of Ada's away.
  expect(await stored(t)).toBe(2);

  await ada.as.action(api.photos.attach, {
    itemId: adasItem,
    side: "front",
    storageId: photo,
  });
  expect(await ada.as.query(api.photos.ofItem, { itemId: adasItem })).toEqual({
    front: expect.any(String),
    back: null,
  });
});

test("uploads never put to use are deleted after an hour, whether registered or not", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const kept = await upload(t);
  await ada.as.action(api.photos.attach, {
    itemId,
    side: "front",
    storageId: kept,
  });
  const registered = await upload(t);
  await ada.as.mutation(api.photos.register, { storageId: registered });
  await upload(t);

  vi.setSystemTime(Date.now() + 30 * 60 * 1000);
  await t.mutation(internal.uploads.sweep, {});
  expect(await stored(t)).toBe(3);

  vi.setSystemTime(Date.now() + 31 * 60 * 1000);
  await t.mutation(internal.uploads.sweep, {});
  expect(await stored(t)).toBe(1);
  expect(await ada.as.query(api.photos.ofItem, { itemId })).toEqual({
    front: expect.any(String),
    back: null,
  });
});

test("deleting the account deletes uploads it registered but never used", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  await ada.as.mutation(api.photos.register, { storageId: await upload(t) });
  await bob.as.mutation(api.photos.register, { storageId: await upload(t) });

  await ada.as.action(api.account.deletion.deleteAccount, {});

  expect(await stored(t)).toBe(1);
});

test("upload addresses are handed out at a steady pace, not without limit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bob = await person(t, "bob@example.com");
  let handedOut = 0;
  await expect(
    (async () => {
      for (; handedOut < 1000; handedOut++)
        await ada.as.mutation(api.photos.generateUploadUrl, {});
    })(),
  ).rejects.toThrow("TOO_MANY_UPLOADS");
  expect(handedOut).toBeGreaterThanOrEqual(20);
  expect(handedOut).toBeLessThan(1000);
  // Someone else's pace is their own.
  await bob.as.mutation(api.photos.generateUploadUrl, {});
});

/** Opens a photo link the way a browser does: no session, just the link. */
const open = (t: Test, link: string) => t.fetch(link.slice(SITE.length));

test("photo links lead to CoinsLite, which serves the photo only for a signed, fresh link", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const photo = file(images.png, 4096);
  await ada.as.action(api.photos.attach, {
    itemId,
    side: "front",
    storageId: await upload(t, photo),
  });
  const link = (await ada.as.query(api.photos.ofItem, { itemId }))!.front!;

  expect(link.startsWith(`${SITE}/photos?`)).toBe(true);
  const served = await open(t, link);
  expect(served.status).toBe(200);
  expect(served.headers.get("content-type")).toBe("image/png");
  expect(served.headers.get("cache-control")).toMatch(/^private/);
  expect(new Uint8Array(await served.arrayBuffer())).toEqual(
    new Uint8Array(await photo.arrayBuffer()),
  );

  // A link someone changed, or made up, opens nothing.
  const url = new URL(link);
  const forged = new URL(link);
  forged.searchParams.set("signature", "0".repeat(64));
  const longer = new URL(link);
  longer.searchParams.set("issued", String(Date.now() + 24 * 60 * 60 * 1000));
  for (const changed of [forged, longer])
    expect((await open(t, changed.toString())).status).toBe(403);
  expect(
    (await open(t, `${SITE}/photos?file=${url.searchParams.get("file")}`))
      .status,
  ).toBe(403);

  // A link is good for an hour at most; the app gets fresh ones before then.
  vi.setSystemTime(Date.now() + 61 * 60 * 1000);
  expect((await open(t, link)).status).toBe(403);
  await t.mutation(internal.photos.links.renew, {});
  const fresh = (await ada.as.query(api.photos.ofItem, { itemId }))!.front!;
  expect(fresh).not.toBe(link);
  expect((await open(t, fresh)).status).toBe(200);
});

test("without a secret on the deployment, photo links still work, signed with one the backend keeps", async () => {
  vi.stubEnv("PHOTO_LINK_SECRET", "");
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  await ada.as.action(api.photos.attach, {
    itemId,
    side: "back",
    storageId: await upload(t),
  });
  const link = (await ada.as.query(api.photos.ofItem, { itemId }))!.back!;

  expect((await open(t, link)).status).toBe(200);
  const forged = new URL(link);
  forged.searchParams.set("signature", "0".repeat(64));
  expect((await open(t, forged.toString())).status).toBe(403);
});

afterEach(() => {
  vi.useRealTimers();
});
