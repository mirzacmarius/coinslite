/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { itemsLeftToAdd, requirePremium, requireRoomForItems } from "./plans";
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

/** Fills a Collection with `count` Items, as if they'd been added over time. */
async function collectionOf(t: Test, ownerId: Id<"users">, count: number) {
  return await t.run(async (ctx) => {
    const ids: Id<"items">[] = [];
    for (let n = 1; n <= count; n++) {
      ids.push(
        await ctx.db.insert("items", {
          ownerId,
          type: "coin",
          title: `Krone ${n}`,
          quantity: 1,
        }),
      );
    }
    return ids;
  });
}

const krone = { type: "coin" as const, title: "1 krone 1875" };

test("the Free plan holds 50 Items: the 50th can be added, a 51st can't", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await collectionOf(t, ada.userId, 49);

  await ada.as.mutation(api.items.add, krone);

  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
});

test("a duplicate is a new Item: it counts toward the limit and can't be made at 50", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const [first] = await collectionOf(t, ada.userId, 49);

  await ada.as.mutation(api.items.duplicate, { itemId: first });

  await expect(
    ada.as.mutation(api.items.duplicate, { itemId: first }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
});

test("plan usage counts Items used out of 50, warns from 40 and says when adding is blocked", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const usage = () => ada.as.query(api.plans.usage, {});

  expect(await usage()).toEqual({
    plan: "free",
    used: 0,
    limit: 50,
    warning: false,
    canAdd: true,
  });

  await collectionOf(t, ada.userId, 39);
  expect(await usage()).toMatchObject({ used: 39, warning: false });

  await ada.as.mutation(api.items.add, krone);
  expect(await usage()).toMatchObject({
    used: 40,
    warning: true,
    canAdd: true,
  });

  await collectionOf(t, ada.userId, 10);
  expect(await usage()).toMatchObject({
    used: 50,
    warning: true,
    canAdd: false,
  });
});

test("Items count, not pieces: Quantity doesn't use up the limit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await collectionOf(t, ada.userId, 48);

  await ada.as.mutation(api.items.add, { ...krone, quantity: 500 });

  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    used: 49,
    canAdd: true,
  });
  await ada.as.mutation(api.items.add, { ...krone, quantity: 2 });
  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
});

test("over the limit (say, after leaving Premium) every Item stays visible and editable; only adding is blocked", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const ids = await collectionOf(t, ada.userId, 51);
  const oldest = ids[0] as Id<"items">;

  const page = await ada.as.query(api.items.list, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  expect(page.page).toHaveLength(51);
  expect(await ada.as.query(api.items.get, { itemId: oldest })).toMatchObject({
    title: "Krone 1",
  });
  await ada.as.mutation(api.items.update, { ...krone, itemId: oldest });
  expect(await ada.as.query(api.items.get, { itemId: oldest })).toMatchObject({
    title: "1 krone 1875",
  });

  await expect(ada.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
  await expect(
    ada.as.mutation(api.items.duplicate, { itemId: oldest }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    used: 51,
    limit: 50,
    canAdd: false,
  });
});

test("only your own Items count toward your limit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const ben = await person(t, "ben@example.com");
  await collectionOf(t, ben.userId, 50);

  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({ used: 0 });
  await ada.as.mutation(api.items.add, krone);
  await expect(ben.as.mutation(api.items.add, krone)).rejects.toThrow(
    "ITEM_LIMIT_REACHED",
  );
});

test("someone signed out, or not set up yet, has no plan usage to show", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });

  expect(await t.query(api.plans.usage, {})).toBeNull();
  expect(await newcomer.as.query(api.plans.usage, {})).toBeNull();
});

test("adding several Items at once (say, from the Catalog) asks how many more fit", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await collectionOf(t, ada.userId, 45);

  expect(await t.run((ctx) => itemsLeftToAdd(ctx, ada.userId))).toBe(5);
  await t.run((ctx) => requireRoomForItems(ctx, ada.userId, 5));
  await expect(
    t.run((ctx) => requireRoomForItems(ctx, ada.userId, 6)),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");

  await collectionOf(t, ada.userId, 10);
  expect(await t.run((ctx) => itemsLeftToAdd(ctx, ada.userId))).toBe(0);
});

test("Premium-only features let Premium members in and turn everyone else away", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const premiumMember = (who: { run: Test["run"] }) =>
    who.run(async (ctx) => (await requirePremium(ctx)).email);

  await expect(premiumMember(t)).rejects.toThrow("NOT_SIGNED_IN");
  await expect(premiumMember(newcomer.as)).rejects.toThrow("NOT_SET_UP");
  await expect(premiumMember(ada.as)).rejects.toThrow("PREMIUM_REQUIRED");

  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId: ada.userId,
      polarId: "sub_1",
      polarCustomerId: "cus_1",
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
  expect(await premiumMember(ada.as)).toBe("ada@example.com");
});
