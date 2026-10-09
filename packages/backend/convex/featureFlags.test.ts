/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

/** A signed-in person; `admin` gives them the admin role, `setUp: false` leaves sign-up unfinished. */
async function person(
  t: Test,
  email: string,
  extra: { admin?: boolean; setUp?: boolean } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
      ...(extra.admin && { role: "admin" as const }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

/** Makes a person Premium, as a paid subscription reported by Polar does. */
async function makePremium(t: Test, userId: Id<"users">) {
  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId,
      polarId: `sub_${userId}`,
      polarCustomerId: `cus_${userId}`,
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
}

test("until an admin changes them, the Catalog is visible and the scanner is off", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const bea = await person(t, "bea@example.com");
  await makePremium(t, bea.userId);

  expect(await admin.as.query(api.featureFlags.list, {})).toEqual({
    catalogVisible: true,
    scannerAvailability: "off",
  });
  expect(await ada.as.query(api.featureFlags.isCatalogVisible, {})).toBe(true);
  for (const who of [admin, ada, bea]) {
    expect(await who.as.query(api.featureFlags.scannerAvailable, {})).toBe(
      false,
    );
  }
});

test("admins change the flags; everyone else can neither change nor list them", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const hideCatalog = {
    flag: { key: "catalogVisible", value: false },
  } as const;

  await expect(t.mutation(api.featureFlags.set, hideCatalog)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  for (const who of [ada, newcomer]) {
    await expect(
      who.as.mutation(api.featureFlags.set, hideCatalog),
    ).rejects.toThrow("NOT_ADMIN");
    await expect(
      who.as.mutation(api.featureFlags.set, {
        flag: { key: "scannerAvailability", value: "premiumBeta" },
      }),
    ).rejects.toThrow("NOT_ADMIN");
    await expect(who.as.query(api.featureFlags.list, {})).rejects.toThrow(
      "NOT_ADMIN",
    );
  }
  await expect(t.query(api.featureFlags.list, {})).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  expect(await admin.as.query(api.featureFlags.list, {})).toEqual({
    catalogVisible: true,
    scannerAvailability: "off",
  });

  await admin.as.mutation(api.featureFlags.set, hideCatalog);
  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "scannerAvailability", value: "admins" },
  });
  expect(await admin.as.query(api.featureFlags.list, {})).toEqual({
    catalogVisible: false,
    scannerAvailability: "admins",
  });

  // Setting a flag again replaces its value.
  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "scannerAvailability", value: "premiumBeta" },
  });
  expect(await admin.as.query(api.featureFlags.list, {})).toEqual({
    catalogVisible: false,
    scannerAvailability: "premiumBeta",
  });
});

test("a flag only takes values of its own type", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const set = (flag: unknown) =>
    admin.as.mutation(api.featureFlags.set, { flag } as never);

  await expect(set({ key: "catalogVisible", value: "off" })).rejects.toThrow();
  await expect(
    set({ key: "scannerAvailability", value: true }),
  ).rejects.toThrow();
  await expect(
    set({ key: "scannerAvailability", value: "everyone" }),
  ).rejects.toThrow();
  await expect(set({ key: "darkLaunch", value: true })).rejects.toThrow();
  expect(await admin.as.query(api.featureFlags.list, {})).toEqual({
    catalogVisible: true,
    scannerAvailability: "off",
  });
});

test("the scanner is for nobody when off, admins when for admins only, and admins plus Premium members in the Premium beta", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const premium = await person(t, "bea@example.com");
  await makePremium(t, premium.userId);
  const free = await person(t, "ada@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  await makePremium(t, newcomer.userId);
  const signedOut = { as: t };

  const whoCanScan = async () => {
    const people = { admin, premium, free, newcomer, signedOut };
    const allowed: string[] = [];
    for (const [name, who] of Object.entries(people)) {
      if (await who.as.query(api.featureFlags.scannerAvailable, {}))
        allowed.push(name);
    }
    return allowed;
  };
  const setScanner = (value: "off" | "admins" | "premiumBeta") =>
    admin.as.mutation(api.featureFlags.set, {
      flag: { key: "scannerAvailability", value },
    });

  expect(await whoCanScan()).toEqual([]);

  await setScanner("admins");
  expect(await whoCanScan()).toEqual(["admin"]);

  await setScanner("premiumBeta");
  expect(await whoCanScan()).toEqual(["admin", "premium"]);

  await setScanner("off");
  expect(await whoCanScan()).toEqual([]);
});

test("a Premium member whose Premium ends leaves the Premium beta", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const bea = await person(t, "bea@example.com");
  await makePremium(t, bea.userId);
  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "scannerAvailability", value: "premiumBeta" },
  });
  expect(await bea.as.query(api.featureFlags.scannerAvailable, {})).toBe(true);

  await t.run(async (ctx) => {
    for (const subscription of await ctx.db.query("subscriptions").take(10))
      await ctx.db.patch("subscriptions", subscription._id, { premium: false });
  });

  expect(await bea.as.query(api.featureFlags.scannerAvailable, {})).toBe(false);
});

/** A small Catalog: Norway, a krone grouping and one entry. */
const catalogCsv = [
  "id,parent_id,item_type,title,country,denomination,series,year_from,is_addable,facts_source",
  "no,,,Norway,NO,,,,,",
  "no-krone,no,,Krone,,,,,,",
  "no-krone-1875,no-krone,coin,1 krone 1875,NO,1 krone,Oscar II,1875,true,Test source",
].join("\n");

/** Everything someone browsing or searching the Catalog would see. */
async function catalogAsSeenBy(who: { as: Pick<Test, "query"> }) {
  const page = { numItems: 10, cursor: null };
  const keys = (rows: { key: string }[] | { page: { key: string }[] }) =>
    ("page" in rows ? rows.page : rows).map(({ key }) => key);
  const krone = { key: "no", denomination: "1 krone" };
  return {
    roots: keys(await who.as.query(api.catalog.browse.roots, {})),
    node: (
      await who.as.query(api.catalog.browse.node, { key: "no-krone-1875" })
    )?.title,
    entries: keys(
      await who.as.query(api.catalog.browse.entries, {
        key: "no-krone",
        paginationOpts: page,
      }),
    ),
    denominations: (
      await who.as.query(api.catalog.browse.denominations, { key: "no" })
    ).map(({ denomination }) => denomination),
    series: (await who.as.query(api.catalog.browse.series, krone)).map(
      ({ series }) => series,
    ),
    seriesEntries: keys(
      await who.as.query(api.catalog.browse.seriesEntries, {
        ...krone,
        series: "Oscar II",
        paginationOpts: page,
      }),
    ),
    found: (
      await who.as.query(api.catalog.search.find, { text: "krone 1875" })
    ).groups.flatMap((group) => group.nodes.map(({ key }) => key)),
  };
}

const wholeCatalog = {
  roots: ["no"],
  node: "1 krone 1875",
  entries: ["no-krone-1875"],
  denominations: ["1 krone"],
  series: ["Oscar II"],
  seriesEntries: ["no-krone-1875"],
  found: ["no-krone-1875"],
};

const noCatalog = {
  roots: [],
  node: undefined,
  entries: [],
  denominations: [],
  series: [],
  seriesEntries: [],
  found: [],
};

test("a hidden Catalog is gone for everyone but admins, in navigation and on the server", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await admin.as.mutation(api.catalog.csv.importFile, { csv: catalogCsv });
  expect(await catalogAsSeenBy(ada)).toEqual(wholeCatalog);

  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: false },
  });

  expect(await ada.as.query(api.featureFlags.isCatalogVisible, {})).toBe(false);
  expect(await t.query(api.featureFlags.isCatalogVisible, {})).toBe(false);
  expect(await catalogAsSeenBy(ada)).toEqual(noCatalog);
  // Admins keep the whole Catalog, so they can curate it while it's hidden.
  expect(await admin.as.query(api.featureFlags.isCatalogVisible, {})).toBe(
    true,
  );
  expect(await catalogAsSeenBy(admin)).toEqual(wholeCatalog);

  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: true },
  });

  expect(await ada.as.query(api.featureFlags.isCatalogVisible, {})).toBe(true);
  expect(await catalogAsSeenBy(ada)).toEqual(wholeCatalog);
});
