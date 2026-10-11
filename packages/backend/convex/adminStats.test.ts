/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-10-09T12:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // The Premium product the subscriptions below are for.
  vi.stubEnv("POLAR_PREMIUM_MONTHLY_PRODUCT_ID", "prod_premium_monthly");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

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

/** A signed-in admin. */
async function admin(t: Test, email = "admin@example.com") {
  const someone = await person(t, email);
  await t.mutation(internal.admin.roles.grant, { email });
  return someone;
}

/** Runs the background count the admin's refresh started, to the end. */
async function finishCounting(t: Test) {
  // Only what's due now: subscriptions also book checks weeks ahead.
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(0));
}

/** What the admin sees after asking for a fresh count. */
async function freshStats(
  t: Test,
  as: Awaited<ReturnType<typeof admin>>["as"],
) {
  await as.mutation(api.admin.stats.refresh, {});
  await finishCounting(t);
  const stats = await as.query(api.admin.stats.get, {});
  if (!stats.latest) throw new Error("No count finished");
  return stats.latest.figures;
}

test("only admins see the stats or ask for a fresh count", async () => {
  const t = newTest();
  const bob = await person(t, "bob@example.com");

  await expect(t.query(api.admin.stats.get, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(t.mutation(api.admin.stats.refresh, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(bob.as.query(api.admin.stats.get, {})).rejects.toThrow(
    "NOT_ADMIN",
  );
  await expect(bob.as.mutation(api.admin.stats.refresh, {})).rejects.toThrow(
    "NOT_ADMIN",
  );
});

test("before the first count there are no figures; a refresh counts everything", async () => {
  const t = newTest();
  const ada = await admin(t);

  expect(await ada.as.query(api.admin.stats.get, {})).toEqual({
    latest: null,
    refreshing: false,
  });

  await ada.as.mutation(api.admin.stats.refresh, {});
  expect(await ada.as.query(api.admin.stats.get, {})).toEqual({
    latest: null,
    refreshing: true,
  });

  await finishCounting(t);
  expect(await ada.as.query(api.admin.stats.get, {})).toEqual({
    latest: {
      countedAt: NOW,
      figures: {
        users: { total: 1, newLast30Days: 1, premium: 0, free: 1 },
        subscriptions: { active: 0, endingWithin30Days: 0, ended: 0 },
        collection: { items: 0, coins: 0, banknotes: 0, stamps: 0, albums: 0 },
        activity: {
          itemsAddedLast24Hours: 0,
          itemsAddedLast7Days: 0,
          albumsCreatedLast30Days: 0,
        },
      },
    },
    refreshing: false,
  });
});

const krone = { type: "coin" as const, title: "1 krone 1875" };
const note = { type: "banknote" as const, title: "100 kroner 1949" };
const stamp = { type: "stamp" as const, title: "Posthorn 1872" };

test("Collection figures add up everyone's Items, by Item type, and Albums", async () => {
  const t = newTest();
  const ada = await admin(t);
  const bob = await person(t, "bob@example.com");
  await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.albums.create, { name: "Travel" });
  await bob.as.mutation(api.items.add, note);
  await bob.as.mutation(api.items.add, stamp);
  // A Collection from before counting began.
  const carol = await person(t, "carol@example.com");
  await t.run(async (ctx) => {
    await ctx.db.insert("items", {
      ownerId: carol.userId,
      ...krone,
      quantity: 1,
    });
    await ctx.db.insert("albums", {
      ownerId: carol.userId,
      name: "Norway",
      colour: "red",
      itemCount: 0,
    });
  });

  expect((await freshStats(t, ada.as)).collection).toEqual({
    items: 4,
    coins: 2,
    banknotes: 1,
    stamps: 1,
    albums: 2,
  });
});

test("users are accounts that proved their email and finished signing up, split by plan", async () => {
  const t = newTest();
  vi.setSystemTime(NOW - 40 * DAY);
  await person(t, "dave@example.com");
  vi.setSystemTime(NOW - 10 * DAY);
  const erin = await person(t, "erin@example.com");
  // A password sign-up whose code was never entered, and an account that
  // hasn't chosen its Home currency yet.
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "pending@example.com",
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK",
    });
    await ctx.db.insert("users", {
      email: "unfinished@example.com",
      emailVerificationTime: Date.now(),
    });
  });
  vi.setSystemTime(NOW);
  const ada = await admin(t);
  await premium(t, erin.userId);

  expect((await freshStats(t, ada.as)).users).toEqual({
    total: 3,
    newLast30Days: 2,
    premium: 1,
    free: 2,
  });
});

/** A Premium subscription for `userId`, as Polar reported it. */
async function premium(
  t: Test,
  userId: string,
  reported: Partial<{
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    endedAt: number;
  }> = {},
) {
  await t.mutation(internal.billing.recordSubscription, {
    polarId: `sub_${userId}`,
    polarCustomerId: `cus_${userId}`,
    productId: "prod_premium_monthly",
    status: "active",
    interval: "month",
    currency: "NOK",
    amount: 3900,
    currentPeriodEnd: Date.now() + 20 * DAY,
    cancelAtPeriodEnd: false,
    modifiedAt: Date.now(),
    buyer: [userId],
    ...reported,
  });
}

test("subscriptions are active, ending within 30 days, or ended", async () => {
  const t = newTest();
  const ada = await admin(t);
  const subscriber = async (email: string) => (await person(t, email)).userId;

  // Active: renews, renews in 20 days but set to end, cancelled with 45 days left.
  await premium(t, await subscriber("renews@example.com"));
  await premium(t, await subscriber("ending@example.com"), {
    cancelAtPeriodEnd: true,
  });
  await premium(t, await subscriber("later@example.com"), {
    status: "canceled",
    currentPeriodEnd: NOW + 45 * DAY,
  });
  // Ended: revoked yesterday, and a period that ran out without a renewal.
  await premium(t, await subscriber("revoked@example.com"), {
    status: "canceled",
    endedAt: NOW - DAY,
  });
  await premium(t, await subscriber("lapsed@example.com"), {
    currentPeriodEnd: NOW - 5 * DAY,
  });
  // A checkout whose first payment never went through.
  await premium(t, await subscriber("declined@example.com"), {
    status: "incomplete",
  });

  expect((await freshStats(t, ada.as)).subscriptions).toEqual({
    active: 3,
    endingWithin30Days: 1,
    ended: 2,
  });
});

test("activity counts the Items added in the last 24 hours and 7 days and the Albums created in the last 30 days", async () => {
  const t = newTest();
  vi.setSystemTime(NOW - 40 * DAY);
  const ada = await admin(t);
  await ada.as.mutation(api.items.add, krone);
  await ada.as.mutation(api.albums.create, { name: "Old" });
  vi.setSystemTime(NOW - 10 * DAY);
  await ada.as.mutation(api.albums.create, { name: "Travel" });
  vi.setSystemTime(NOW - 8 * DAY);
  await ada.as.mutation(api.items.add, krone);
  vi.setSystemTime(NOW - 3 * DAY);
  await ada.as.mutation(api.items.add, note);
  vi.setSystemTime(NOW - 2 * HOUR);
  await ada.as.mutation(api.items.add, stamp);
  const deleted = await ada.as.mutation(api.items.add, stamp);
  await ada.as.mutation(api.items.remove, { itemId: deleted });
  vi.setSystemTime(NOW);

  const figures = await freshStats(t, ada.as);
  expect(figures.activity).toEqual({
    itemsAddedLast24Hours: 1,
    itemsAddedLast7Days: 2,
    albumsCreatedLast30Days: 1,
  });
  expect(figures.collection).toMatchObject({ items: 4, albums: 2 });
});

test("a deleted account stops counting at once, while its Collection is still being cleared up", async () => {
  const t = newTest();
  const ada = await admin(t);
  const bob = await person(t, "bob@example.com");
  await bob.as.mutation(api.items.add, krone);
  await bob.as.mutation(api.albums.create, { name: "Travel" });

  await t.run((ctx) => ctx.db.delete(bob.userId));

  const figures = await freshStats(t, ada.as);
  expect(figures.users).toMatchObject({ total: 1, free: 1 });
  expect(figures.collection).toMatchObject({ items: 0, albums: 0 });
});

test("a refresh while a count is under way doesn't start another; a count that stalled is started over", async () => {
  const t = newTest();
  const ada = await admin(t);

  await ada.as.mutation(api.admin.stats.refresh, {});
  await ada.as.mutation(api.admin.stats.refresh, {});
  await finishCounting(t);
  expect(await ada.as.query(api.admin.stats.get, {})).toMatchObject({
    latest: { countedAt: NOW },
    refreshing: false,
  });

  // A count whose batches stop running.
  vi.setSystemTime(NOW + HOUR);
  await ada.as.mutation(api.admin.stats.refresh, {});
  vi.setSystemTime(NOW + HOUR + 5 * 60 * 1000);
  await ada.as.mutation(api.admin.stats.refresh, {});
  expect(await ada.as.query(api.admin.stats.get, {})).toMatchObject({
    latest: { countedAt: NOW },
    refreshing: true,
  });
  vi.setSystemTime(NOW + HOUR + 20 * 60 * 1000);
  await ada.as.mutation(api.admin.stats.refresh, {});
  await finishCounting(t);
  expect(await ada.as.query(api.admin.stats.get, {})).toMatchObject({
    latest: { countedAt: NOW + HOUR + 20 * 60 * 1000 },
    refreshing: false,
  });
});

test("the hourly count needs no admin", async () => {
  const t = newTest();
  const ada = await admin(t);
  await ada.as.mutation(api.items.add, krone);

  await t.mutation(internal.admin.stats.hourly, {});
  await finishCounting(t);

  expect(await ada.as.query(api.admin.stats.get, {})).toMatchObject({
    latest: { figures: { collection: { items: 1, coins: 1 } } },
  });
});

test("a count reads everyone a batch per transaction, so it works however many people there are", async () => {
  // Far fewer documents per transaction than there are to count.
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { documentsRead: 800 },
  });
  vi.setSystemTime(NOW - DAY);
  await t.run(async (ctx) => {
    for (let n = 0; n < 300; n++) {
      const ownerId = await ctx.db.insert("users", {
        email: `collector${n}@example.com`,
        emailVerificationTime: Date.now(),
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK",
      });
      for (const item of [krone, note, stamp])
        await ctx.db.insert("items", { ownerId, ...item, quantity: 1 });
    }
  });
  vi.setSystemTime(NOW);
  const ada = await admin(t);

  const figures = await freshStats(t, ada.as);
  expect(figures.users.total).toBe(301);
  expect(figures.collection).toEqual({
    items: 900,
    coins: 300,
    banknotes: 300,
    stamps: 300,
    albums: 0,
  });
  expect(figures.activity.itemsAddedLast7Days).toBe(900);
});

test("selling Items doesn't change the Collection figures: they count every Item", async () => {
  const t = newTest();
  const ada = await admin(t);
  const bob = await person(t, "bob@example.com");
  await ada.as.mutation(api.items.add, krone);
  const sold = await bob.as.mutation(api.items.add, note);
  await bob.as.mutation(api.items.sell, { itemId: sold, soldOn: "2026-10-01" });

  expect((await freshStats(t, ada.as)).collection).toEqual({
    items: 2,
    coins: 1,
    banknotes: 1,
    stamps: 0,
    albums: 0,
  });
});
