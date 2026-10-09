/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { Value } from "convex/values";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { planFilters, sortOrders, userSorts } from "./admin/userList";
import { startCollectionCounts } from "./collectionCounts";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-09T12:00:00Z").getTime();

// Signing in issues tokens and sends codes to the outbox.
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

/**
 * A person who has finished signing up, signed in. Like every new account,
 * they start with empty Collection counts.
 */
async function person(t: Test, email: string, extra: { setUp?: boolean } = {}) {
  const userId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
    });
    await startCollectionCounts(ctx, userId);
    return userId;
  });
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

/** A signed-in admin. */
async function admin(t: Test, email = "admin@example.com") {
  const someone = await person(t, email);
  await t.mutation(internal.admin.roles.grant, { email });
  return someone;
}

const firstPage = { numItems: 50, cursor: null };

test("only admins list, search or look up users", async () => {
  const t = newTest();
  const bob = await person(t, "bob@example.com");
  const list = { sort: "created", order: "desc", plan: "all" } as const;

  await expect(
    t.query(api.admin.users.list, { ...list, paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    bob.as.query(api.admin.users.list, { ...list, paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_ADMIN");
  await expect(
    t.query(api.admin.users.search, { ...list, text: "bob" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    bob.as.query(api.admin.users.search, { ...list, text: "bob" }),
  ).rejects.toThrow("NOT_ADMIN");
  await expect(
    t.query(api.admin.users.get, { userId: bob.userId }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    bob.as.query(api.admin.users.get, { userId: bob.userId }),
  ).rejects.toThrow("NOT_ADMIN");
});

type As = Awaited<ReturnType<typeof admin>>["as"];
type ListArgs = {
  sort: (typeof userSorts)[number];
  order?: (typeof sortOrders)[number];
  plan?: (typeof planFilters)[number];
};

/** Every page of the list, in order, as the emails shown. */
async function listed(
  as: As,
  { sort, order = "asc", plan = "all" }: ListArgs,
  pageSize = 2,
) {
  const emails: (string | null)[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page: {
      page: { email: string | null }[];
      isDone: boolean;
      continueCursor: string;
    } = await as.query(api.admin.users.list, {
      sort,
      order,
      plan,
      paginationOpts: { numItems: pageSize, cursor },
    });
    emails.push(...page.page.map((user) => user.email));
    if (page.isDone) return emails;
    cursor = page.continueCursor;
  }
}

test("the list pages through everyone, newest or oldest account first", async () => {
  const t = newTest();
  vi.setSystemTime(NOW - 30 * DAY);
  const ada = await admin(t, "ada@example.com");
  vi.setSystemTime(NOW - 20 * DAY);
  await person(t, "bob@example.com");
  vi.setSystemTime(NOW - 10 * DAY);
  await person(t, "cy@example.com", { setUp: false });

  expect(await listed(ada.as, { sort: "created", order: "desc" })).toEqual([
    "cy@example.com",
    "bob@example.com",
    "ada@example.com",
  ]);
  expect(await listed(ada.as, { sort: "created", order: "asc" })).toEqual([
    "ada@example.com",
    "bob@example.com",
    "cy@example.com",
  ]);
});

test("each listed user shows their profile, plan, Collection and last sign-in", async () => {
  const t = newTest();
  vi.setSystemTime(NOW - DAY);
  const ada = await admin(t, "ada@example.com");
  vi.setSystemTime(NOW);
  const bob = await person(t, "bob@example.com");
  await bob.as.mutation(api.account.updateContact, { displayName: "Bob" });
  await bob.as.mutation(api.items.add, { type: "coin", title: "1 krone 1875" });
  await bob.as.mutation(api.albums.create, { name: "Travel" });

  const { page } = await ada.as.query(api.admin.users.list, {
    sort: "email",
    order: "asc",
    plan: "all",
    paginationOpts: firstPage,
  });
  expect(page).toEqual([
    {
      userId: ada.userId,
      name: null,
      email: "ada@example.com",
      createdAt: NOW - DAY,
      admin: true,
      signedUp: true,
      plan: "free",
      planEnd: null,
      items: 0,
      albums: 0,
      lastSignInAt: null,
    },
    {
      userId: bob.userId,
      name: "Bob",
      email: "bob@example.com",
      createdAt: NOW,
      admin: false,
      signedUp: true,
      plan: "free",
      planEnd: null,
      items: 1,
      albums: 1,
      lastSignInAt: null,
    },
  ]);
});

/** A set-up person with a display name, as they'd set it on the Account screen. */
async function named(t: Test, email: string, displayName: string) {
  const someone = await person(t, email);
  await someone.as.mutation(api.account.updateContact, { displayName });
  return someone;
}

test("sorting by name ignores capitals and accents", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  await ada.as.mutation(api.account.updateContact, { displayName: "adam" });
  await named(t, "zoe@example.com", "zoe");
  await named(t, "emile@example.com", "Émile");
  await named(t, "bob@example.com", "Bob");
  await named(t, "erik@example.com", "erik");

  expect(await listed(ada.as, { sort: "name", order: "asc" })).toEqual([
    "ada@example.com",
    "bob@example.com",
    "emile@example.com",
    "erik@example.com",
    "zoe@example.com",
  ]);
  expect(await listed(ada.as, { sort: "name", order: "desc" })).toEqual([
    "zoe@example.com",
    "erik@example.com",
    "emile@example.com",
    "bob@example.com",
    "ada@example.com",
  ]);
});

const signIn = (t: Test, params: Record<string, Value>) =>
  t.action(api.auth.signIn, { provider: "password", params });

/** Signs up with a password and confirms the email with the code sent. */
async function signUp(t: Test, email: string) {
  await signIn(t, {
    flow: "signUp",
    email,
    password: "correct horse",
    acceptTerms: "true",
    homeCurrency: "NOK",
    language: "en",
  });
  const code = await t.query(internal.accounts.emails.latestCodeFor, {
    email,
  });
  if (code === null) throw new Error(`No code was sent to ${email}`);
  await signIn(t, { flow: "email-verification", email, code });
}

test("new accounts are listed by name, and every sign-in counts as the latest", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  vi.setSystemTime(NOW - 3 * DAY);
  await signUp(t, "zed@example.com");
  vi.setSystemTime(NOW - 2 * DAY);
  await signUp(t, "cy@example.com");
  vi.setSystemTime(NOW - DAY);
  await signIn(t, {
    flow: "signIn",
    email: "zed@example.com",
    password: "correct horse",
  });
  vi.setSystemTime(NOW);

  // Accounts start with their email's first part as their name.
  expect(await listed(ada.as, { sort: "name", order: "desc" })).toEqual([
    "zed@example.com",
    "cy@example.com",
    // No name yet.
    "ada@example.com",
  ]);
  const { page } = await ada.as.query(api.admin.users.list, {
    sort: "lastSignIn",
    order: "desc",
    plan: "all",
    paginationOpts: firstPage,
  });
  expect(
    page.map(({ email, lastSignInAt }) => ({ email, lastSignInAt })),
  ).toEqual([
    { email: "zed@example.com", lastSignInAt: NOW - DAY },
    { email: "cy@example.com", lastSignInAt: NOW - 2 * DAY },
    { email: "ada@example.com", lastSignInAt: null },
  ]);
});

/** A Premium subscription for `userId`, as Polar reported it. */
async function premium(
  t: Test,
  userId: Id<"users">,
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

/** Four people a day apart: an admin, two on Premium and one on the Free plan. */
async function subscribers(t: Test) {
  vi.setSystemTime(NOW - 4 * DAY);
  const ada = await admin(t, "ada@example.com");
  vi.setSystemTime(NOW - 3 * DAY);
  const bob = await person(t, "bob@example.com");
  vi.setSystemTime(NOW - 2 * DAY);
  const cy = await person(t, "cy@example.com");
  vi.setSystemTime(NOW - DAY);
  await person(t, "dan@example.com");
  vi.setSystemTime(NOW);
  // Bob's renews in 20 days; Cy cancelled, so hers ends in 5.
  await premium(t, bob.userId);
  await premium(t, cy.userId, {
    currentPeriodEnd: NOW + 5 * DAY,
    cancelAtPeriodEnd: true,
  });
  return { ada, bob, cy };
}

test("the list narrows to one plan and sorts by plan and plan end", async () => {
  const t = newTest();
  const { ada } = await subscribers(t);

  expect(
    await listed(ada.as, { sort: "created", order: "asc", plan: "premium" }),
  ).toEqual(["bob@example.com", "cy@example.com"]);
  expect(
    await listed(ada.as, { sort: "created", order: "asc", plan: "free" }),
  ).toEqual(["ada@example.com", "dan@example.com"]);
  // Premium first, newest first within each plan.
  expect(await listed(ada.as, { sort: "plan", order: "desc" })).toEqual([
    "cy@example.com",
    "bob@example.com",
    "dan@example.com",
    "ada@example.com",
  ]);
  // Ending soonest first; the Free plan has no end.
  expect(
    await listed(ada.as, { sort: "planEnd", order: "asc", plan: "premium" }),
  ).toEqual(["cy@example.com", "bob@example.com"]);
  expect(await listed(ada.as, { sort: "planEnd", order: "desc" })).toEqual([
    "bob@example.com",
    "cy@example.com",
    "dan@example.com",
    "ada@example.com",
  ]);

  const { page } = await ada.as.query(api.admin.users.list, {
    sort: "planEnd",
    order: "desc",
    plan: "premium",
    paginationOpts: firstPage,
  });
  expect(
    page.map(({ email, plan, planEnd }) => ({ email, plan, planEnd })),
  ).toEqual([
    { email: "bob@example.com", plan: "premium", planEnd: NOW + 20 * DAY },
    { email: "cy@example.com", plan: "premium", planEnd: NOW + 5 * DAY },
  ]);
});

test("every sort, either way, lists everyone on the chosen plan once", async () => {
  const t = newTest();
  const { ada } = await subscribers(t);
  const onPlan = {
    all: ["ada", "bob", "cy", "dan"],
    premium: ["bob", "cy"],
    free: ["ada", "dan"],
  };

  for (const plan of planFilters) {
    for (const sort of userSorts) {
      for (const order of sortOrders) {
        const emails = await listed(ada.as, { sort, order, plan });
        expect([...emails].sort(), `${sort} ${order} on ${plan}`).toEqual(
          onPlan[plan].map((name) => `${name}@example.com`),
        );
      }
    }
  }
});

test("someone whose Premium runs out moves to the Free plan in the list", async () => {
  const t = newTest();
  const { ada } = await subscribers(t);

  vi.advanceTimersByTime(6 * DAY);
  await t.finishInProgressScheduledFunctions();

  expect(
    await listed(ada.as, { sort: "created", order: "asc", plan: "premium" }),
  ).toEqual(["bob@example.com"]);
  expect(
    await listed(ada.as, { sort: "created", order: "asc", plan: "free" }),
  ).toEqual(["ada@example.com", "cy@example.com", "dan@example.com"]);
});

/** Adds Items and creates Albums for someone, as they would. */
async function holding(
  someone: Awaited<ReturnType<typeof person>>,
  { items, albums }: { items: number; albums: number },
) {
  for (let n = 1; n <= items; n++) {
    await someone.as.mutation(api.items.add, {
      type: "coin",
      title: `Krone ${n}`,
    });
  }
  for (let n = 1; n <= albums; n++) {
    await someone.as.mutation(api.albums.create, { name: `Album ${n}` });
  }
}

test("sorting by Items or Albums ranks people by how much they hold, within a plan too", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  await holding(ada, { items: 4, albums: 3 });
  await holding(await person(t, "bob@example.com"), { items: 3, albums: 1 });
  await holding(await person(t, "cy@example.com"), { items: 1, albums: 2 });
  // Premium before adding anything.
  const dan = await person(t, "dan@example.com");
  await premium(t, dan.userId);
  await holding(dan, { items: 2, albums: 4 });
  // A new account that holds nothing yet.
  await signUp(t, "eve@example.com");

  expect(await listed(ada.as, { sort: "items", order: "desc" })).toEqual([
    "ada@example.com",
    "bob@example.com",
    "dan@example.com",
    "cy@example.com",
    "eve@example.com",
  ]);
  expect(await listed(ada.as, { sort: "albums", order: "asc" })).toEqual([
    "eve@example.com",
    "bob@example.com",
    "cy@example.com",
    "ada@example.com",
    "dan@example.com",
  ]);
  expect(
    await listed(ada.as, { sort: "items", order: "desc", plan: "premium" }),
  ).toEqual(["dan@example.com"]);
  expect(
    await listed(ada.as, { sort: "albums", order: "desc", plan: "free" }),
  ).toEqual([
    "ada@example.com",
    "cy@example.com",
    "bob@example.com",
    "eve@example.com",
  ]);
});

test("accounts from before the list kept its order join it with the hourly count", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  await ada.as.mutation(api.account.updateContact, { displayName: "Ada" });
  await holding(ada, { items: 2, albums: 0 });
  // Accounts as they were: a name but no sort key, and no Collection counts.
  const legacy = async (email: string, displayName: string, items: number) => {
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email,
        displayName,
        emailVerificationTime: Date.now(),
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
    );
    for (let n = 0; n < items; n++) {
      await t.run((ctx) =>
        ctx.db.insert("items", {
          ownerId: userId,
          type: "coin",
          title: "Krone",
          quantity: 1,
        }),
      );
    }
    return userId;
  };
  const zoe = await legacy("zoe@example.com", "Zoë", 3);
  await legacy("bea@example.com", "bea", 1);
  await premium(t, zoe);

  await ada.as.mutation(api.admin.stats.refresh, {});
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(0));

  expect(await listed(ada.as, { sort: "name", order: "asc" })).toEqual([
    "ada@example.com",
    "bea@example.com",
    "zoe@example.com",
  ]);
  expect(await listed(ada.as, { sort: "items", order: "desc" })).toEqual([
    "zoe@example.com",
    "ada@example.com",
    "bea@example.com",
  ]);
  expect(
    await listed(ada.as, { sort: "items", order: "desc", plan: "premium" }),
  ).toEqual(["zoe@example.com"]);
});

const search = (
  as: As,
  text: string,
  { sort = "name", order = "asc", plan = "all" }: Partial<ListArgs> = {},
) => as.query(api.admin.users.search, { text, sort, order, plan });

const emailsOf = (found: { users: { email: string | null }[] }) =>
  found.users.map((user) => user.email);

test("search finds people by their name or email, on one plan if asked", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  await ada.as.mutation(api.account.updateContact, {
    displayName: "Ada Lovelace",
  });
  const bob = await named(t, "bob@example.com", "Bob");
  await named(t, "robert@coins.no", "bobby");
  await named(t, "cy@example.com", "Cy");
  await premium(t, bob.userId);

  // A word of the name, or the start of one, in any case.
  expect(emailsOf(await search(ada.as, "lovel"))).toEqual(["ada@example.com"]);
  expect(emailsOf(await search(ada.as, "BOB"))).toEqual([
    "bob@example.com",
    "robert@coins.no",
  ]);
  // The start of an email, or all of it.
  expect(emailsOf(await search(ada.as, "rob"))).toEqual(["robert@coins.no"]);
  expect(emailsOf(await search(ada.as, " cy@example.com "))).toEqual([
    "cy@example.com",
  ]);
  expect(emailsOf(await search(ada.as, "bob", { plan: "premium" }))).toEqual([
    "bob@example.com",
  ]);
  expect(emailsOf(await search(ada.as, "bob", { plan: "free" }))).toEqual([
    "robert@coins.no",
  ]);
  expect(await search(ada.as, "nobody")).toEqual({ users: [], more: false });
  expect(await search(ada.as, "  ")).toEqual({ users: [], more: false });
});

test("a whole email finds just that person", async () => {
  const t = newTest();
  const ada = await namedAdmin(t);
  const cy = await named(t, "cy@example.com", "Cy");
  // Convex's search splits emails into words, so most people share some of
  // them with any email; here it's the start of one.
  await named(t, "cy@example.com.au", "Cy Jones");

  expect(emailsOf(await search(ada.as, " CY@example.com "))).toEqual([
    "cy@example.com",
  ]);
  expect(await search(ada.as, "cy@example.com", { plan: "premium" })).toEqual({
    users: [],
    more: false,
  });
  await premium(t, cy.userId);
  expect(
    emailsOf(await search(ada.as, "cy@example.com", { plan: "premium" })),
  ).toEqual(["cy@example.com"]);
});

/**
 * A signed-in admin with a name. convex-test's search can't skip people
 * without one, as Convex does, so searches here name everyone.
 */
async function namedAdmin(t: Test) {
  const ada = await admin(t, "ada@example.com");
  await ada.as.mutation(api.account.updateContact, { displayName: "Ada" });
  return ada;
}

test("search results come in the chosen order", async () => {
  const t = newTest();
  const ada = await namedAdmin(t);
  vi.setSystemTime(NOW - 2 * DAY);
  const first = await named(t, "first@example.com", "Coin collector B");
  await holding(first, { items: 1, albums: 0 });
  vi.setSystemTime(NOW - DAY);
  const second = await named(t, "second@example.com", "coin collector A");
  await holding(second, { items: 3, albums: 0 });
  vi.setSystemTime(NOW);
  const third = await named(t, "third@example.com", "Coin collector C");
  await holding(third, { items: 2, albums: 0 });

  expect(emailsOf(await search(ada.as, "collector"))).toEqual([
    "second@example.com",
    "first@example.com",
    "third@example.com",
  ]);
  expect(
    emailsOf(
      await search(ada.as, "collector", { sort: "created", order: "desc" }),
    ),
  ).toEqual(["third@example.com", "second@example.com", "first@example.com"]);
  expect(
    emailsOf(
      await search(ada.as, "collector", { sort: "items", order: "desc" }),
    ),
  ).toEqual(["second@example.com", "third@example.com", "first@example.com"]);
});

test("a search shows the best 50 matches and says there are more", async () => {
  const t = newTest();
  const ada = await namedAdmin(t);
  for (let n = 1; n <= 51; n++) {
    await named(t, `collector${n}@example.com`, `Collector ${n}`);
  }

  const found = await search(ada.as, "collector");
  expect(found.users).toHaveLength(50);
  expect(found.more).toBe(true);
  expect((await search(ada.as, "collector5")).more).toBe(false);
});

test("the detail shows a user's profile, account dates, role, subscription and Collection", async () => {
  const t = newTest();
  vi.setSystemTime(NOW - 20 * DAY);
  const ada = await admin(t, "ada@example.com");
  vi.setSystemTime(NOW - 10 * DAY);
  await signUp(t, "bob@example.com");
  const bobId = (await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "bob@example.com"))
      .unique(),
  ))!._id;
  const bob = t.withIdentity({ subject: `${bobId}|session` });
  await bob.mutation(api.account.updateContact, {
    displayName: "Bob",
    fullName: "Robert Smith",
    streetAddress: "Storgata 1",
    postalCode: "0155",
    city: "Oslo",
    country: "NO",
    contactPhone: "+47 22 12 34 56",
  });
  await bob.mutation(api.items.add, { type: "coin", title: "1 krone 1875" });
  await bob.mutation(api.items.add, { type: "banknote", title: "100 kroner" });
  await bob.mutation(api.albums.create, { name: "Travel" });
  vi.setSystemTime(NOW - DAY);
  await premium(t, bobId, {
    currentPeriodEnd: NOW + 29 * DAY,
    cancelAtPeriodEnd: true,
  });
  vi.setSystemTime(NOW);

  expect(await ada.as.query(api.admin.users.get, { userId: bobId })).toEqual({
    userId: bobId,
    profile: {
      name: "Bob",
      email: "bob@example.com",
      fullName: "Robert Smith",
      contactPhone: "+47 22 12 34 56",
      streetAddress: "Storgata 1",
      postalCode: "0155",
      city: "Oslo",
      country: "NO",
      language: "en",
      homeCurrency: "NOK",
    },
    account: {
      createdAt: NOW - 10 * DAY,
      emailVerifiedAt: NOW - 10 * DAY,
      signedUpAt: NOW - 10 * DAY,
      lastSignInAt: NOW - 10 * DAY,
    },
    admin: false,
    plan: "premium",
    subscription: {
      status: "active",
      interval: "month",
      currency: "NOK",
      amount: 3900,
      startedAt: NOW - DAY,
      currentPeriodEnd: NOW + 29 * DAY,
      cancelAtPeriodEnd: true,
      endedAt: null,
      premium: true,
    },
    collection: { items: 2, coins: 1, banknotes: 1, stamps: 0, albums: 1 },
  });

  const self = await ada.as.query(api.admin.users.get, { userId: ada.userId });
  expect(self?.admin).toBe(true);
  expect(self?.plan).toBe("free");
  expect(self?.subscription).toBeNull();
});

test("the detail shows a subscription that has ended, on the Free plan", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  const cy = await person(t, "cy@example.com");
  await premium(t, cy.userId, { status: "canceled", endedAt: NOW - DAY });

  const detail = await ada.as.query(api.admin.users.get, { userId: cy.userId });
  expect(detail?.plan).toBe("free");
  expect(detail?.subscription).toMatchObject({
    status: "canceled",
    endedAt: NOW - DAY,
    premium: false,
  });
});

test("looking up someone who doesn't exist finds nothing", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  const gone = await person(t, "gone@example.com");
  await t.run((ctx) => ctx.db.delete(gone.userId));

  expect(
    await ada.as.query(api.admin.users.get, { userId: gone.userId }),
  ).toBeNull();
  expect(
    await ada.as.query(api.admin.users.get, { userId: "nonsense" }),
  ).toBeNull();
});

test("a Premium account counted for the first time is ranked within Premium straight away", async () => {
  const t = newTest();
  const ada = await admin(t, "ada@example.com");
  // From before counting began: no Collection counts yet.
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "zoe@example.com",
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
    }),
  );
  await premium(t, userId);
  await t
    .withIdentity({ subject: `${userId}|session` })
    .mutation(api.items.add, { type: "coin", title: "1 krone 1875" });

  expect(
    await listed(ada.as, { sort: "items", order: "desc", plan: "premium" }),
  ).toEqual(["zoe@example.com"]);
});
