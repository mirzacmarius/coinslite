/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { rateLimiter as emailChangeLimits } from "./account";
import { deletionBatch, summaryItemLimit } from "./account/deletion";
import { rateLimiter as codeEmailLimits } from "./accounts/codeEmails";
import { rateLimiter as feedbackLimits } from "./feedback";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  process.env.JWT_PRIVATE_KEY = (await exportPKCS8(privateKey))
    .trimEnd()
    .replace(/\n/g, " ");
  process.env.JWKS = JSON.stringify({
    keys: [{ use: "sig", ...(await exportJWK(publicKey)) }],
  });
  process.env.SITE_URL = "http://localhost:3000";
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
  process.env.EMAIL_DELIVERY = "outbox";
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

const password = "correct horse";
const signIn = (t: Test, params: Record<string, string>) =>
  t.action(api.auth.signIn, { provider: "password", params });

/** Someone signs up with a password and verifies their email, as the app does. */
async function signedUp(t: Test, email: string) {
  await signIn(t, {
    flow: "signUp",
    email,
    password,
    acceptTerms: "true",
    homeCurrency: "NOK",
    language: "en",
  });
  const code = await t.run(
    async (ctx) =>
      (
        await ctx.db
          .query("devOutbox")
          .withIndex("by_to", (q) => q.eq("to", email))
          .order("desc")
          .first()
      )?.code ?? "",
  );
  await signIn(t, { flow: "email-verification", email, code });
  const { user, session } = await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error(`${email} didn't sign up`);
    const session = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .first();
    if (!session) throw new Error(`${email} isn't signed in`);
    return { user, session };
  });
  return {
    userId: user._id,
    email,
    as: t.withIdentity({ subject: `${user._id}|${session._id}` }),
  };
}

const firstPage = { numItems: 20, cursor: null };

type Person = Awaited<ReturnType<typeof signedUp>>;

/** A small JPEG-looking file, as the browser uploads it. */
const jpeg = () => {
  const bytes = new Uint8Array(2048);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return new Blob([bytes]);
};

async function addPhoto(
  t: Test,
  person: Person,
  itemId: Id<"items">,
  side: "front" | "back",
) {
  const storageId = await t.run((ctx) => ctx.storage.store(jpeg()));
  await person.as.action(api.photos.attach, { itemId, side, storageId });
  return storageId;
}

/**
 * A Collection like a real one: Items in two Albums and one without, with
 * photos on both sides of one Item and on the front of another.
 */
async function fillCollection(t: Test, person: Person) {
  const travel = await person.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "blue",
  });
  const silver = await person.as.mutation(api.albums.create, {
    name: "Silver",
    colour: "green",
  });
  const krone = await person.as.mutation(api.items.add, {
    type: "coin",
    title: "1 krone 1875",
    albumId: travel,
  });
  const dollar = await person.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881",
    albumId: silver,
  });
  await person.as.mutation(api.items.add, {
    type: "stamp",
    title: "Posthorn 1872",
  });
  const photos = [
    await addPhoto(t, person, krone, "front"),
    await addPhoto(t, person, krone, "back"),
    await addPhoto(t, person, dollar, "front"),
  ];
  return { albums: [travel, silver], photos };
}

const fileExists = (t: Test, storageId: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(storageId)) !== null);

test("deleting the account signs the person out and removes their profile and sign-in", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");

  await ada.as.mutation(api.account.deletion.deleteAccount, {});

  expect(await ada.as.query(api.users.getUser, {})).toBeNull();
  // Screens still open while the app signs out show nothing, not an error.
  expect(await ada.as.query(api.account.deletion.summary, {})).toBeNull();
  await expect(
    ada.as.query(api.items.list, { paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  const left = await t.run(async (ctx) => ({
    users: await ctx.db.query("users").collect(),
    accounts: await ctx.db.query("authAccounts").collect(),
    sessions: await ctx.db.query("authSessions").collect(),
    refreshTokens: await ctx.db.query("authRefreshTokens").collect(),
  }));
  expect(left).toEqual({
    users: [],
    accounts: [],
    sessions: [],
    refreshTokens: [],
  });
  await expect(
    signIn(t, { flow: "signIn", email: ada.email, password }),
  ).rejects.toThrow();
});

test("deleting the account removes the Items, their stored photos and the Albums", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  const { photos } = await fillCollection(t, ada);

  await ada.as.mutation(api.account.deletion.deleteAccount, {});

  const left = await t.run(async (ctx) => ({
    items: await ctx.db.query("items").collect(),
    albums: await ctx.db.query("albums").collect(),
  }));
  expect(left).toEqual({ items: [], albums: [] });
  for (const photo of photos) expect(await fileExists(t, photo)).toBe(false);
});

/** Runs the work due now, such as sending emails; later work (a link expiring) waits. */
async function runDueWork(t: Test) {
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
}

/** Everything someone leaves behind by using CoinsLite, beyond their Collection. */
async function useAccount(t: Test, person: Person) {
  // A second device, and a mistyped password on it.
  await signIn(t, { flow: "signIn", email: person.email, password });
  await signIn(t, {
    flow: "signIn",
    email: person.email,
    password: "wrong horse",
  }).catch(() => {});
  // A password reset asked for, and a wrong code tried.
  await signIn(t, { flow: "reset", email: person.email });
  await signIn(t, {
    flow: "reset-verification",
    email: person.email,
    code: "00000000",
    newPassword: "battery staple",
  }).catch(() => {});
  // A Google sign-in started from a signed-in session, never finished.
  await t.run(async (ctx) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", person.userId))
      .first();
    await ctx.db.insert("authVerifiers", {
      sessionId: session?._id,
      signature: `google-${person.email}`,
    });
  });
  // An email change waiting for its link, and feedback sent.
  await person.as.mutation(api.account.requestEmailChange, {
    newEmail: person.email.replace("@example.com", "@example.org"),
  });
  await person.as.mutation(api.feedback.send, { message: "Lovely app" });
  await runDueWork(t);
}

/** Every document in every table, and every stored file. */
const everything = (t: Test) =>
  t.run(async (ctx) => {
    const all: Record<string, { _id: string }[]> = {};
    for (const table of Object.keys(schema.tables) as TableNames[])
      all[table] = await ctx.db.query(table).collect();
    all.files = await ctx.db.system.query("_storage").collect();
    return all;
  });

/**
 * The ids of everything that is the person's: documents that mention them
 * (their id, email or files), or mention a document that does, such as a
 * refresh token of one of their sessions.
 */
function idsOfTheirs(all: Record<string, { _id: string }[]>, seeds: string[]) {
  const ids = new Set(seeds);
  for (let grew = true; grew; ) {
    grew = false;
    for (const doc of Object.values(all).flat()) {
      if (ids.has(doc._id)) continue;
      const text = JSON.stringify(doc);
      if ([...ids].some((id) => text.includes(id))) {
        ids.add(doc._id);
        grew = true;
      }
    }
  }
  return ids;
}

/** What rate limits have counted against the person: lower is more used. */
const limitsLeft = (t: Test, person: Person) =>
  t.run(async (ctx) => ({
    feedback: (
      await feedbackLimits.getValue(ctx, "feedback", { key: person.userId })
    ).value,
    emailChange: (
      await emailChangeLimits.getValue(ctx, "emailChange", {
        key: person.userId,
      })
    ).value,
    codeEmail: (
      await codeEmailLimits.getValue(ctx, "codeEmail", { key: person.email })
    ).value,
  }));

test("nothing of the person remains afterwards, and nobody else's data changes", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  const bo = await signedUp(t, "bo@example.com");
  for (const person of [ada, bo]) await useAccount(t, person);
  const { photos } = await fillCollection(t, ada);
  await fillCollection(t, bo);
  // A profile picture from before CoinsLite, still on old accounts.
  const picture = await t.run(async (ctx) => {
    const imageId = await ctx.storage.store(jpeg());
    await ctx.db.patch(ada.userId, { imageId });
    return imageId;
  });
  const before = await everything(t);
  const bosLimits = await limitsLeft(t, bo);
  expect(await limitsLeft(t, ada)).not.toEqual({
    feedback: 5,
    emailChange: 5,
    codeEmail: 5,
  });

  await ada.as.mutation(api.account.deletion.deleteAccount, {});
  await runDueWork(t);

  const adas = idsOfTheirs(before, [ada.userId, ada.email, ...photos, picture]);
  const expected = Object.fromEntries(
    Object.entries(before).map(([table, docs]) => [
      table,
      docs.filter((doc) => !adas.has(doc._id)),
    ]),
  );
  expect(await everything(t)).toEqual(expected);
  // Each table that held something of Ada's was really looked at.
  const emptied = Object.entries(before)
    .filter(([table, docs]) => docs.length > expected[table].length)
    .map(([table]) => table)
    .sort();
  expect(emptied).toEqual(
    [
      "albums",
      "authAccounts",
      "authRateLimits",
      "authRefreshTokens",
      "authSessions",
      "authVerificationCodes",
      "authVerifiers",
      "devOutbox",
      "emailChanges",
      "files",
      "items",
      "users",
    ].sort(),
  );
  expect(await limitsLeft(t, ada)).toEqual({
    feedback: 5,
    emailChange: 5,
    codeEmail: 5,
  });
  expect(await limitsLeft(t, bo)).toEqual(bosLimits);
});

test("a large Collection goes in the background, a batch at a time, after the account closes at once", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  const bo = await signedUp(t, "bo@example.com");
  const bosKrone = await bo.as.mutation(api.items.add, {
    type: "coin",
    title: "1 krone 1875",
  });
  const total = deletionBatch * 2 + 50;
  await t.run(async (ctx) => {
    for (let n = 0; n < total; n++) {
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "coin",
        title: `Coin ${n}`,
        quantity: 1,
      });
      // As many emails, as a busy local test account collects.
      await ctx.db.insert("devOutbox", {
        to: ada.email,
        subject: `Email ${n}`,
        text: "Hello",
      });
    }
  });
  const adasItems = () =>
    t.run(
      async (ctx) =>
        (
          await ctx.db
            .query("items")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", ada.userId))
            .collect()
        ).length,
    );

  await ada.as.mutation(api.account.deletion.deleteAccount, {});

  const atOnce = await t.run(async (ctx) => ({
    user: await ctx.db.get(ada.userId),
    sessions: await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", ada.userId))
      .collect(),
  }));
  expect(atOnce).toEqual({ user: null, sessions: [] });
  expect(await adasItems()).toBeGreaterThan(0);

  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(await adasItems()).toBe(0);
  expect(await bo.as.query(api.items.get, { itemId: bosKrone })).toMatchObject({
    title: "1 krone 1875",
  });
});

test("the email is free at once: signing up with it again starts a new, empty account", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  // More emails than one batch, as a busy local test account collects.
  await t.run(async (ctx) => {
    for (let n = 0; n < deletionBatch + 10; n++)
      await ctx.db.insert("devOutbox", {
        to: ada.email,
        subject: `Email ${n}`,
        text: "Hello",
      });
  });
  await ada.as.mutation(api.items.add, { type: "coin", title: "Krone" });
  vi.advanceTimersByTime(1000);

  await ada.as.mutation(api.account.deletion.deleteAccount, {});
  // Before the background has finished: the clock stands still meanwhile.
  const again = await signedUp(t, "ada@example.com");
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(again.userId).not.toBe(ada.userId);
  expect(
    await again.as.query(api.items.list, { paginationOpts: firstPage }),
  ).toMatchObject({ page: [] });
  const outbox = await t.run((ctx) =>
    ctx.db
      .query("devOutbox")
      .withIndex("by_to", (q) => q.eq("to", ada.email))
      .collect(),
  );
  // Only the new account's verification code is left.
  expect(outbox.map(({ subject }) => subject)).toEqual([
    "Your CoinsLite verification code",
  ]);
});

test("the confirmation counts the Items, photos and Albums that will go", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  const bo = await signedUp(t, "bo@example.com");
  await fillCollection(t, ada);
  await fillCollection(t, bo);
  await bo.as.mutation(api.items.add, { type: "coin", title: "Krone" });

  expect(await ada.as.query(api.account.deletion.summary, {})).toEqual({
    items: 3,
    photos: 3,
    albums: 2,
    more: false,
  });
  expect(await t.query(api.account.deletion.summary, {})).toBeNull();
});

test("past its limit the confirmation counts Items no further and says there are more", async () => {
  const t = newTest();
  const ada = await signedUp(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n <= summaryItemLimit; n++)
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "coin",
        title: `Coin ${n}`,
        quantity: 1,
      });
  });

  expect(await ada.as.query(api.account.deletion.summary, {})).toEqual({
    items: summaryItemLimit,
    photos: 0,
    albums: 0,
    more: true,
  });
});
