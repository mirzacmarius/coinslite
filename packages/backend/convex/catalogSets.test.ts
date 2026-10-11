/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { formatCsvRecord } from "./catalog/csvText";
import { setLimits } from "./catalog/setRules";
import { collectionCountsOf } from "./collectionCounts";
import schema from "./schema";

/**
 * Sets (spec 6.4) and adding many Catalog entries at once (spec 6.2,
 * multi-select): how complete each Set is, and filling its gaps in one go.
 */

const modules = import.meta.glob("./**/*.*s");

/** Production's transaction limits are enforced, so big Sets and big adds prove they fit. */
const newTest = () => {
  const t = convexTest({ schema, modules, transactionLimits: true });
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;
type Caller = ReturnType<Test["withIdentity"]>;

/** A signed-in person; `admin` lets them import Catalog files. */
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

type Row = Record<string, string>;

/** Imports Catalog rows as an admin, with whatever columns the rows use. */
async function importRows(admin: Caller, rows: Row[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    formatCsvRecord(columns),
    ...rows.map((row) =>
      formatCsvRecord(columns.map((column) => row[column] ?? "")),
    ),
  ].join("");
  const report = await admin.mutation(api.catalog.csv.importFile, { csv });
  if (!report.applied) throw new Error(JSON.stringify(report.errors));
}

const country = (id: string, title: string, code: string): Row => ({
  id,
  title,
  country: code,
});

const grouping = (
  id: string,
  parent: string,
  title: string,
  extra: Row = {},
): Row => ({ id, parent_id: parent, title, ...extra });

/** A coin Catalog entry below `parent`, from `year`. */
const entry = (
  id: string,
  parent: string,
  year: number | null,
  extra: Row = {},
): Row => ({
  id,
  parent_id: parent,
  title: id,
  item_type: "coin",
  is_addable: "true",
  ...(year !== null && { year_from: String(year), year_to: String(year) }),
  facts_source: "Test source",
  facts_author: "Test source",
  facts_licence: "Public domain",
  facts_link: "https://example.org/facts",
  ...extra,
});

/**
 * Norway's krone: two reigns as sub-groups, entered out of year order, plus
 * one krone straight below the denomination; and an øre beside it.
 */
const norway: Row[] = [
  country("no", "Norway", "NO"),
  grouping("no-krone", "no", "1 krone", { sort_order: "1" }),
  grouping("no-krone-olav", "no-krone", "Olav V", { sort_order: "1" }),
  entry("no-krone-1975", "no-krone-olav", 1975, { sort_order: "1" }),
  entry("no-krone-1974", "no-krone-olav", 1974, { sort_order: "2" }),
  grouping("no-krone-harald", "no-krone", "Harald V", { sort_order: "2" }),
  entry("no-krone-1992", "no-krone-harald", 1992),
  entry("no-krone-1950", "no-krone", 1950),
  grouping("no-ore", "no", "1 øre", { sort_order: "2" }),
  entry("no-ore-1918", "no-ore", 1918),
];

/** A Catalog with Norway in it; returns an admin and a collector. */
async function withCatalog(t: Test, rows: Row[] = norway) {
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, rows);
  return { admin, ada };
}

type SetArgs = {
  key: string;
  denomination?: string | null;
  series?: string | null;
};

/** A Set as its view shows it; null when there's no such Set. Fails on one too large to view. */
async function openSet(as: Caller, args: SetArgs) {
  const set = await as.query(api.catalog.sets.get, args);
  if (set && "tooLarge" in set) throw new Error(`${args.key} is too large`);
  return set;
}

type OpenSet = NonNullable<Awaited<ReturnType<typeof openSet>>>;

/** Each group's entry keys, in order. */
const keysOf = (set: OpenSet | null) =>
  set?.groups.map((group) => group.entries.map(({ key }) => key));

/** Each entry's key with how many the person holds, in order. */
const heldOf = (set: OpenSet | null) =>
  set?.groups.flatMap((group) =>
    group.entries.map(({ key, held }) => [key, held]),
  );

test("a grouping opens as a Set: its entries grouped by sub-group, each sorted by year", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);

  const set = await openSet(ada.as, { key: "no-krone" });

  expect(set).toMatchObject({
    key: "no-krone",
    title: "1 krone",
    ancestors: [{ key: "no", title: "Norway" }],
    groups: [
      { key: "no-krone", titles: [] },
      { key: "no-krone-olav", titles: ["Olav V"] },
      { key: "no-krone-harald", titles: ["Harald V"] },
    ],
  });
  expect(keysOf(set)).toEqual([
    ["no-krone-1950"],
    ["no-krone-1974", "no-krone-1975"],
    ["no-krone-1992"],
  ]);
});

/** Gives a person an Item linked to a Catalog entry, as adding it from the Catalog would. */
async function holdItem(
  t: Test,
  ownerId: Id<"users">,
  entryKey: string,
  quantity = 1,
) {
  await t.run(async (ctx) => {
    const node = await ctx.db
      .query("catalogNodes")
      .withIndex("by_key", (q) => q.eq("key", entryKey))
      .unique();
    if (!node) throw new Error(`No Catalog entry ${entryKey}`);
    await ctx.db.insert("items", {
      ownerId,
      type: "coin",
      title: node.title,
      quantity,
      catalogEntryId: node._id,
    });
  });
}

test("completion counts the entries held at least once, out of all, as a percentage rounded down", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const bob = await person(t, "bob@example.com");
  const krone = { key: "no-krone" };

  expect(await ada.as.query(api.catalog.sets.get, krone)).toMatchObject({
    total: 4,
    held: 0,
    percent: 0,
  });

  // Two Items of one entry, one of them three pieces: one entry held, 4 pieces.
  await holdItem(t, ada.userId, "no-krone-1974", 3);
  await holdItem(t, ada.userId, "no-krone-1974");
  // Outside the Set, and someone else's: neither counts.
  await holdItem(t, ada.userId, "no-ore-1918");
  await holdItem(t, bob.userId, "no-krone-1975");
  const oneOfFour = await openSet(ada.as, krone);
  expect(oneOfFour).toMatchObject({ total: 4, held: 1, percent: 25 });
  expect(heldOf(oneOfFour)).toEqual([
    ["no-krone-1950", 0],
    ["no-krone-1974", 4],
    ["no-krone-1975", 0],
    ["no-krone-1992", 0],
  ]);

  // 2 of 3 is 66%, not 67%; only a complete Set shows 100%.
  const olav = { key: "no-krone-olav" };
  await holdItem(t, ada.userId, "no-krone-1975");
  await holdItem(t, ada.userId, "no-krone-1992");
  expect(await ada.as.query(api.catalog.sets.get, krone)).toMatchObject({
    total: 4,
    held: 3,
    percent: 75,
  });
  expect(await ada.as.query(api.catalog.sets.get, olav)).toMatchObject({
    total: 2,
    held: 2,
    percent: 100,
  });
  await importRows(
    (await person(t, "admin2@example.com", { admin: true })).as,
    [entry("no-krone-1976", "no-krone-olav", 1976)],
  );
  expect(await ada.as.query(api.catalog.sets.get, olav)).toMatchObject({
    total: 3,
    held: 2,
    percent: 66,
  });
});

test("only countries, Themes and groupings with more than one entry below them are Sets", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const setOf = (key: string) => ada.as.query(api.catalog.sets.get, { key });

  // A country root: its sub-groups at every depth, with the way down to each.
  const norwaySet = await setOf("no");
  expect(norwaySet).toMatchObject({
    key: "no",
    title: "Norway",
    ancestors: [],
    total: 5,
    groups: [
      { key: "no-krone", titles: ["1 krone"] },
      { key: "no-krone-olav", titles: ["1 krone", "Olav V"] },
      { key: "no-krone-harald", titles: ["1 krone", "Harald V"] },
      { key: "no-ore", titles: ["1 øre"] },
    ],
  });
  // A grouping with a single entry, an entry, a key not in the Catalog.
  expect(await setOf("no-ore")).toBeNull();
  expect(await setOf("no-krone-1950")).toBeNull();
  expect(await setOf("nowhere")).toBeNull();
});

test("a Theme is a Set of its countries' entries: the bundled 2-euro commemoratives fit in one query", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.action(internal.catalog.seed.load, {});

  const set = await openSet(ada.as, { key: "eur2-commemoratives" });

  // 584 coins from 24 countries, each country a sub-group in name order.
  expect(set).toMatchObject({ total: 584, held: 0, percent: 0 });
  expect(set?.groups).toHaveLength(24);
  expect(set?.groups.slice(0, 3).map(({ titles }) => titles)).toEqual([
    ["Andorra"],
    ["Austria"],
    ["Belgium"],
  ]);
  // Each sub-group is a country, which the app names in the reader's language.
  expect(set?.groups.slice(0, 3).map(({ country }) => country)).toEqual([
    "AD",
    "AT",
    "BE",
  ]);
  const years = set?.groups[1]?.entries.map(({ yearFrom }) => yearFrom) ?? [];
  expect(years).toEqual([...years].sort((a = 0, b = 0) => a - b));
});

test("a grouping with more entries than a Set may have says so instead", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const many = setLimits.entries + 1;
  await importRows(admin.as, [
    grouping("no-many", "no", "Many"),
    ...Array.from({ length: many }, (_, n) =>
      entry(`no-many-${n}`, "no-many", 1900 + (n % 100)),
    ),
  ]);

  expect(await ada.as.query(api.catalog.sets.get, { key: "no-many" })).toEqual({
    key: "no-many",
    title: "Many",
    countryNode: false,
    ancestors: [
      { key: "no", title: "Norway", country: "NO", countryNode: true },
    ],
    tooLarge: true,
  });
});

test("a Set within the entry limit opens however many groupings lie between its entries, and empty groupings don't count", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  // Each entry two groupings down, plus as many empty groupings: more
  // Catalog nodes in all than entries a Set may have, twice over.
  const count = 600;
  await importRows(admin.as, [
    grouping("no-deep", "no", "Deep"),
    ...Array.from({ length: count }, (_, n) => [
      grouping(`no-deep-${n}`, "no-deep", `Group ${n}`),
      grouping(`no-deep-${n}-a`, `no-deep-${n}`, `Group ${n} A`),
      grouping(`no-deep-${n}-b`, `no-deep-${n}`, `Group ${n} B`),
      entry(`no-deep-${n}-a-1`, `no-deep-${n}-a`, 1900),
    ]).flat(),
  ]);

  const set = await openSet(ada.as, { key: "no-deep" });
  expect(set?.total).toBe(count);
}, 60_000);

test("Sets are for set-up people, and hidden with the Catalog", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const krone = { key: "no-krone" };

  await expect(t.query(api.catalog.sets.get, krone)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(newcomer.as.query(api.catalog.sets.get, krone)).rejects.toThrow(
    "NOT_SET_UP",
  );

  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: false },
  });
  expect(await ada.as.query(api.catalog.sets.get, krone)).toBeNull();
  expect(await admin.as.query(api.catalog.sets.get, krone)).toMatchObject({
    total: 4,
  });
});

/** Sweden, browsed by denomination: no groupings, just denominations and series on the entries. */
const sweden: Row[] = [
  country("se", "Sweden", "SE"),
  entry("se-krona-1952", "se", 1952, {
    denomination: "1 krona",
    series: "Gustaf VI Adolf",
  }),
  entry("se-krona-1920", "se", 1920, {
    denomination: "1 krona",
    series: "Gustaf V",
  }),
  entry("se-krona-1910", "se", 1910, {
    denomination: "1 krona",
    series: "Gustaf V",
  }),
  entry("se-krona-1900", "se", 1900, { denomination: "1 krona" }),
  entry("se-ore-1909", "se", 1909, {
    denomination: "1 öre",
    series: "Gustaf V",
  }),
  entry("se-token", "se", null),
];

test("on the denomination path, a denomination is a Set of its series, and so is each series", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t, sweden);
  const setOf = (denomination: string | null, series?: string | null) =>
    openSet(ada.as, {
      key: "se",
      denomination,
      ...(series !== undefined && { series }),
    });

  // A denomination: its series by first year, then the entries without one.
  const krona = await setOf("1 krona");
  expect(krona).toMatchObject({
    key: "se",
    title: "Sweden",
    total: 4,
    groups: [
      { key: "Gustaf V", titles: ["Gustaf V"] },
      { key: "Gustaf VI Adolf", titles: ["Gustaf VI Adolf"] },
      { key: "", titles: [] },
    ],
  });
  expect(keysOf(krona)).toEqual([
    ["se-krona-1910", "se-krona-1920"],
    ["se-krona-1952"],
    ["se-krona-1900"],
  ]);

  // One series of a denomination: every year of it.
  const gustafV = await setOf("1 krona", "Gustaf V");
  expect(gustafV).toMatchObject({ total: 2, held: 0 });
  expect(keysOf(gustafV)).toEqual([["se-krona-1910", "se-krona-1920"]]);

  // One entry is no Set; nor is a level of a node that isn't a country.
  expect(await setOf("1 krona", "Gustaf VI Adolf")).toBeNull();
  expect(await setOf(null)).toBeNull();
  expect(await setOf("1 öre")).toBeNull();
  expect(
    await ada.as.query(api.catalog.sets.get, {
      key: "se-krona-1910",
      denomination: "1 krona",
    }),
  ).toBeNull();
});

test("adding entries makes one Item of each, linked to it with a Quantity of 1, in the Album chosen", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "Krone",
    colour: "teal",
  });

  const itemIds = await ada.as.mutation(api.items.addCatalogEntries, {
    catalogEntryKeys: ["no-krone-1950", "no-krone-1974", "no-krone-1975"],
    albumId,
  });

  expect(itemIds).toHaveLength(3);
  expect(
    await ada.as.query(api.items.get, { itemId: itemIds[1] as string }),
  ).toMatchObject({
    type: "coin",
    title: "no-krone-1974",
    quantity: 1,
    year: 1974,
    albumId,
    catalogEntry: { key: "no-krone-1974" },
  });
  expect(await ada.as.query(api.albums.get, { albumId })).toMatchObject({
    itemCount: 3,
  });
  expect(
    await t.run((ctx) => collectionCountsOf(ctx, ada.userId)),
  ).toMatchObject({ items: 3, coins: 3 });
  expect(
    await ada.as.query(api.catalog.sets.get, { key: "no-krone" }),
  ).toMatchObject({ total: 4, held: 3, percent: 75 });
});

/** How many Items a person has, as the Free plan counts them. */
async function itemCount(t: Test, ownerId: Id<"users">) {
  const items = await t.run((ctx) =>
    ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .collect(),
  );
  return items.length;
}

test("an entry already held is refused, and nothing added, unless the person allows a duplicate", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await holdItem(t, ada.userId, "no-krone-1974", 2);
  const both = { catalogEntryKeys: ["no-krone-1950", "no-krone-1974"] };

  await expect(
    ada.as.mutation(api.items.addCatalogEntries, both),
  ).rejects.toThrow("ALREADY_HELD");
  expect(await itemCount(t, ada.userId)).toBe(1);

  await ada.as.mutation(api.items.addCatalogEntries, {
    ...both,
    allowDuplicates: true,
  });
  expect(heldOf(await openSet(ada.as, { key: "no-krone" }))).toEqual([
    ["no-krone-1950", 1],
    ["no-krone-1974", 3],
    ["no-krone-1975", 0],
    ["no-krone-1992", 0],
  ]);
  expect(await itemCount(t, ada.userId)).toBe(3);

  // The same entry chosen twice is one selection: one Item.
  await ada.as.mutation(api.items.addCatalogEntries, {
    catalogEntryKeys: ["no-krone-1975", "no-krone-1975"],
  });
  expect(await itemCount(t, ada.userId)).toBe(4);
});

/** Fills a Collection with `count` Items added by hand. */
async function collectionOf(t: Test, ownerId: Id<"users">, count: number) {
  await t.run(async (ctx) => {
    for (let n = 1; n <= count; n++) {
      await ctx.db.insert("items", {
        ownerId,
        type: "coin",
        title: `Krone ${n}`,
        quantity: 1,
      });
    }
  });
}

test("the Free plan quota is checked for the whole selection first: over it, nothing is added", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await collectionOf(t, ada.userId, 46);
  const kroner = ["no-krone-1950", "no-krone-1974", "no-krone-1975"];

  // 4 places left: 5 entries don't fit, so none is added.
  await expect(
    ada.as.mutation(api.items.addCatalogEntries, {
      catalogEntryKeys: [...kroner, "no-krone-1992", "no-ore-1918"],
    }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  expect(await itemCount(t, ada.userId)).toBe(46);

  // 4 fit exactly; then the plan is full.
  await ada.as.mutation(api.items.addCatalogEntries, {
    catalogEntryKeys: [...kroner, "no-krone-1992"],
  });
  expect(await ada.as.query(api.plans.usage, {})).toMatchObject({
    used: 50,
    canAdd: false,
  });
  await expect(
    ada.as.mutation(api.items.addCatalogEntries, {
      catalogEntryKeys: ["no-ore-1918"],
    }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
});

/** Makes a person Premium, as Polar's webhook would record it. */
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

test("up to 200 entries go in one add, within a mutation's limits; 201 are refused", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await makePremium(t, ada.userId);
  await t.action(internal.catalog.seed.load, {});
  const keys = (
    keysOf(await openSet(ada.as, { key: "eur2-commemoratives" })) ?? []
  ).flat();
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "2 euro",
    colour: "teal",
  });

  await expect(
    ada.as.mutation(api.items.addCatalogEntries, {
      catalogEntryKeys: keys.slice(0, setLimits.bulkAdd + 1),
      albumId,
    }),
  ).rejects.toThrow("TOO_MANY_ENTRIES");
  expect(await itemCount(t, ada.userId)).toBe(0);

  const itemIds = await ada.as.mutation(api.items.addCatalogEntries, {
    catalogEntryKeys: keys.slice(0, setLimits.bulkAdd),
    albumId,
  });
  expect(itemIds).toHaveLength(200);
  expect(await ada.as.query(api.albums.get, { albumId })).toMatchObject({
    itemCount: 200,
  });
  expect(
    await t.run((ctx) => collectionCountsOf(ctx, ada.userId)),
  ).toMatchObject({ items: 200, coins: 200 });
  expect(
    await ada.as.query(api.catalog.sets.get, { key: "eur2-commemoratives" }),
  ).toMatchObject({ total: 584, held: 200, percent: 34 });
});

test("adding is for set-up people, from Catalog entries they can see, into their own Albums; any refusal adds nothing", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const bob = await person(t, "bob@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const bobsAlbum = await bob.as.mutation(api.albums.create, { name: "Bob's" });
  const add = { catalogEntryKeys: ["no-krone-1950", "no-krone-1974"] };

  await expect(t.mutation(api.items.addCatalogEntries, add)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    newcomer.as.mutation(api.items.addCatalogEntries, add),
  ).rejects.toThrow("NOT_SET_UP");
  await expect(
    ada.as.mutation(api.items.addCatalogEntries, {
      ...add,
      albumId: bobsAlbum,
    }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  // A grouping, or a key not in the Catalog, among the entries.
  for (const key of ["no-krone", "nowhere"]) {
    await expect(
      ada.as.mutation(api.items.addCatalogEntries, {
        catalogEntryKeys: [...add.catalogEntryKeys, key],
      }),
    ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
  }
  expect(await itemCount(t, ada.userId)).toBe(0);

  // While the Catalog is hidden, only admins add from it.
  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: false },
  });
  await expect(
    ada.as.mutation(api.items.addCatalogEntries, add),
  ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
  expect(
    await admin.as.mutation(api.items.addCatalogEntries, add),
  ).toHaveLength(2);
});

test("how many of chosen entries a person holds, for marking search results while selecting", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const bob = await person(t, "bob@example.com");
  await holdItem(t, ada.userId, "no-krone-1974", 2);
  await holdItem(t, bob.userId, "no-krone-1950");

  expect(
    await ada.as.query(api.catalog.sets.heldCounts, {
      keys: ["no-krone-1950", "no-krone-1974", "no-krone", "nowhere"],
    }),
  ).toEqual([
    { key: "no-krone-1950", held: 0 },
    { key: "no-krone-1974", held: 2 },
  ]);
  await expect(
    ada.as.query(api.catalog.sets.heldCounts, {
      keys: Array.from({ length: setLimits.bulkAdd + 1 }, (_, n) => `k${n}`),
    }),
  ).rejects.toThrow("TOO_MANY_ENTRIES");
  await expect(
    t.query(api.catalog.sets.heldCounts, { keys: [] }),
  ).rejects.toThrow("NOT_SIGNED_IN");
});

test("selling the held Item drops the Set's completion and the entry's held count", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await holdItem(t, ada.userId, "no-krone-1974", 2);
  await holdItem(t, ada.userId, "no-krone-1975");
  const itemOf = (title: string) =>
    t.run(async (ctx) =>
      (
        await ctx.db
          .query("items")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", ada.userId))
          .collect()
      ).find((item) => item.title === title),
    );
  const sold = await itemOf("no-krone-1975");
  if (!sold) throw new Error("No 1975 krone");
  const krone = { key: "no-krone" };
  expect(await ada.as.query(api.catalog.sets.get, krone)).toMatchObject({
    held: 2,
  });

  await ada.as.mutation(api.items.sell, {
    itemId: sold._id,
    soldOn: "2026-10-01",
  });

  expect(await ada.as.query(api.catalog.sets.get, krone)).toMatchObject({
    held: 1,
  });
  expect(
    await ada.as.query(api.catalog.sets.heldCounts, {
      keys: ["no-krone-1974", "no-krone-1975"],
    }),
  ).toEqual([
    { key: "no-krone-1974", held: 2 },
    { key: "no-krone-1975", held: 0 },
  ]);
  // No longer held, it can be added again without allowing a duplicate.
  await ada.as.mutation(api.items.addCatalogEntries, {
    catalogEntryKeys: ["no-krone-1975"],
  });
});
