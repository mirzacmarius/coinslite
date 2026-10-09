/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { formatCsvRecord } from "./catalog/csvText";
import { collectionCountsOf } from "./collectionCounts";
import schema from "./schema";

/**
 * Items added from the Catalog (spec 5.4, 6.2, 6.3; ADR 0001): they stay
 * linked to their Catalog entry and read its descriptive facts, except the
 * ones the person changed.
 */

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
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

/** A Morgan dollar as the Catalog has it. */
const morgan1881: Row = {
  id: "us-morgan-1881-cc",
  parent_id: "us",
  title: "Morgan dollar 1881-CC",
  item_type: "coin",
  is_addable: "true",
  country: "US",
  denomination: "1 dollar",
  series: "Morgan dollar",
  material: "silver",
  strike: "circulation",
  metal: "silver",
  weight_g: "26.73",
  fineness: "0.9",
  diameter_mm: "38.1",
  year_from: "1881",
  year_to: "1881",
  numista_id: "1492",
  facts_source: "United States Mint",
  facts_author: "United States Mint",
  facts_licence: "Public domain",
  facts_link: "https://example.org/facts",
};

/** A Catalog with one country and the Morgan dollar in it; returns an admin and a collector. */
async function withCatalog(t: Test) {
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    { id: "us", title: "United States", country: "US" },
    morgan1881,
  ]);
  return { admin, ada };
}

test("an Item added from a Catalog entry shows the entry's descriptive facts", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);

  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 2,
  });

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    type: "coin",
    title: "Morgan dollar 1881-CC",
    quantity: 2,
    country: "US",
    year: 1881,
    denomination: "1 dollar",
    series: "Morgan dollar",
    material: "silver",
    strike: "circulation",
    diameter: 38.1,
    numistaNumber: 1492,
    metal: "silver",
    weight: 26.73,
    purity: 0.9,
    catalogEntry: { key: "us-morgan-1881-cc", title: "Morgan dollar 1881-CC" },
  });
});

test("Catalog corrections reach the Items linked to the entry", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
  });

  await importRows(admin.as, [
    { ...morgan1881, weight_g: "26.7", series: "Morgan silver dollar" },
  ]);

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    weight: 26.7,
    series: "Morgan silver dollar",
  });
});

test("the facts a person changes are kept when the entry changes; the rest follow it", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    denomination: "One dollar",
    weight: 26.5,
  });

  await importRows(admin.as, [
    {
      ...morgan1881,
      denomination: "1 dollar (silver)",
      weight_g: "26.7",
      series: "Morgan silver dollar",
    },
  ]);

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "One dollar",
    weight: 26.5,
    series: "Morgan silver dollar",
    metal: "silver",
    purity: 0.9,
  });
});

test("a fact set to what the entry says isn't an override, so it keeps following the entry", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    country: "US",
    year: 1881,
    denomination: "1 dollar",
    metal: "silver",
    weight: 26.73,
    purity: 0.9,
  });

  await importRows(admin.as, [
    { ...morgan1881, denomination: "1 dollar (silver)", weight_g: "26.7" },
  ]);

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "1 dollar (silver)",
    weight: 26.7,
  });
});

test("editing a linked Item stores only what differs from the entry; a cleared fact follows the entry again", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
  });

  // The whole form, as the Item form sends it: the entry's facts, one changed.
  await ada.as.mutation(api.items.update, {
    itemId,
    type: "coin",
    title: "Morgan dollar 1881-CC, toned",
    country: "US",
    year: 1881,
    denomination: "One dollar",
    series: "Morgan dollar",
    metal: "silver",
    weight: 26.73,
    purity: 0.9,
    quantity: 3,
    grade: "63",
    gradingScale: "sheldon",
  });
  await importRows(admin.as, [
    { ...morgan1881, denomination: "1 dollar (silver)", weight_g: "26.7" },
  ]);
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    title: "Morgan dollar 1881-CC, toned",
    denomination: "One dollar",
    weight: 26.7,
    quantity: 3,
    grade: "63",
    catalogEntry: { key: "us-morgan-1881-cc" },
  });

  // Leaving the denomination out: the entry's shows again.
  await ada.as.mutation(api.items.update, {
    itemId,
    type: "coin",
    title: "Morgan dollar 1881-CC, toned",
  });
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "1 dollar (silver)",
    weight: 26.7,
    country: "US",
  });
});

test("an override survives edits to other fields, even while it matches the entry; only changing it to the entry's value ends it", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    denomination: "One dollar",
  });
  /** The whole form as the Item form sends it, from what the Item shows. */
  const save = async (changes: {
    quantity?: number;
    denomination?: string;
  }) => {
    const shown = (await ada.as.query(api.items.get, { itemId }))!;
    await ada.as.mutation(api.items.update, {
      itemId,
      type: "coin",
      title: shown.title,
      country: shown.country,
      year: shown.year,
      denomination: shown.denomination,
      series: shown.series,
      metal: shown.metal,
      weight: shown.weight,
      purity: shown.purity,
      quantity: shown.quantity,
      ...changes,
    });
  };

  // The Catalog comes to say what the person said, then they change the Quantity.
  await importRows(admin.as, [{ ...morgan1881, denomination: "One dollar" }]);
  await save({ quantity: 2 });
  await importRows(admin.as, [
    { ...morgan1881, denomination: "1 dollar (silver)" },
  ]);
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "One dollar",
    quantity: 2,
  });

  // Setting it to the entry's value in a save makes it follow the entry again.
  await save({ denomination: "1 dollar (silver)" });
  await importRows(admin.as, [{ ...morgan1881, denomination: "1 dollar" }]);
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "1 dollar",
    quantity: 2,
  });
});

test("Items added by hand keep their own facts, whatever the Catalog says", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    country: "US",
    denomination: "1 dollar",
  });

  await importRows(admin.as, [{ ...morgan1881, denomination: "One dollar" }]);

  const item = await ada.as.query(api.items.get, { itemId });
  expect(item).toMatchObject({ country: "US", denomination: "1 dollar" });
  expect(item?.series).toBeUndefined();
  expect(item?.weight).toBeUndefined();
  expect(item?.catalogEntry).toBeNull();
});

test("an Item from the Catalog has its entry's Item type", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  await importRows(admin.as, [
    {
      id: "us-note-1",
      parent_id: "us",
      title: "1 dollar 1957",
      item_type: "banknote",
      is_addable: "true",
      country: "US",
      denomination: "1 dollar",
      year_from: "1957",
      facts_source: "Bureau of Engraving and Printing",
      facts_author: "Bureau of Engraving and Printing",
      facts_licence: "Public domain",
      facts_link: "https://example.org/facts",
    },
  ]);

  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "1 dollar 1957",
    catalogEntryKey: "us-note-1",
  });

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    type: "banknote",
    year: 1957,
    denomination: "1 dollar",
  });
});

test("only Catalog entries can be added from, not countries or groupings", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);

  for (const catalogEntryKey of ["us", "no-such-entry"]) {
    await expect(
      ada.as.mutation(api.items.add, {
        type: "coin",
        title: "Something",
        catalogEntryKey,
      }),
    ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
  }
});

test("an entry over several years leaves the year to the person", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  await importRows(admin.as, [
    {
      ...morgan1881,
      id: "us-morgan-type",
      title: "Morgan dollar",
      year_from: "1878",
      year_to: "1904",
    },
  ]);

  const unknownYear = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar",
    catalogEntryKey: "us-morgan-type",
  });
  const ownYear = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar",
    catalogEntryKey: "us-morgan-type",
    year: 1885,
  });

  expect(
    (await ada.as.query(api.items.get, { itemId: unknownYear }))?.year,
  ).toBeUndefined();
  expect((await ada.as.query(api.items.get, { itemId: ownYear }))?.year).toBe(
    1885,
  );
});

test("quick add makes one Item with the Quantity, Grade and Album chosen", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "Silver dollars",
    colour: "teal",
  });

  const itemId = await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 5,
    grade: "63",
    gradingScale: "sheldon",
    albumId,
  });

  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    type: "coin",
    title: "Morgan dollar 1881-CC",
    quantity: 5,
    grade: "63",
    gradingScale: "sheldon",
    albumId,
    denomination: "1 dollar",
    catalogEntry: { key: "us-morgan-1881-cc" },
  });
  const browse = await ada.as.query(api.collection.browse, {
    view: {},
    page: 1,
    pageSize: 25,
  });
  expect(browse.total).toBe(1);
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "us-morgan-1881-cc" }),
  ).toMatchObject({ held: 5 });
  expect(await ada.as.query(api.albums.get, { albumId })).toMatchObject({
    itemCount: 1,
  });
  expect(
    await t.run((ctx) => collectionCountsOf(ctx, ada.userId)),
  ).toMatchObject({ items: 1, coins: 1 });
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

test("the Free plan limit holds however an Item is added from the Catalog", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await collectionOf(t, ada.userId, 48);

  // The 49th from the picker, the 50th by quick add (Quantity doesn't count).
  const picked = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
  });
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 10,
  });

  await expect(
    ada.as.mutation(api.items.add, {
      type: "coin",
      title: "Morgan dollar 1881-CC",
      catalogEntryKey: "us-morgan-1881-cc",
    }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  await expect(
    ada.as.mutation(api.items.quickAdd, {
      catalogEntryKey: "us-morgan-1881-cc",
    }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  await expect(
    ada.as.mutation(api.items.duplicate, { itemId: picked }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
});

test("quick add is for set-up people, into their own Albums only", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const bob = await person(t, "bob@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const bobsAlbum = await bob.as.mutation(api.albums.create, {
    name: "Bob's",
  });
  const add = { catalogEntryKey: "us-morgan-1881-cc" };

  await expect(t.mutation(api.items.quickAdd, add)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(newcomer.as.mutation(api.items.quickAdd, add)).rejects.toThrow(
    "NOT_SET_UP",
  );
  await expect(
    ada.as.mutation(api.items.quickAdd, { ...add, albumId: bobsAlbum }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
  await expect(
    ada.as.mutation(api.items.quickAdd, { ...add, quantity: 0 }),
  ).rejects.toThrow("INVALID_QUANTITY");
  await expect(
    ada.as.mutation(api.items.quickAdd, {
      ...add,
      grade: "UNC",
      gradingScale: "international",
    }),
  ).rejects.toThrow("INVALID_GRADE");
  await expect(
    ada.as.mutation(api.items.quickAdd, { catalogEntryKey: "us" }),
  ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
});

test("a duplicate of a linked Item stays linked, with the same changed facts", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    denomination: "One dollar",
  });

  const copyId = await ada.as.mutation(api.items.duplicate, { itemId });
  await importRows(admin.as, [
    { ...morgan1881, denomination: "1 dollar (silver)", weight_g: "26.7" },
  ]);

  expect(await ada.as.query(api.items.get, { itemId: copyId })).toMatchObject({
    denomination: "One dollar",
    weight: 26.7,
    catalogEntry: { key: "us-morgan-1881-cc" },
  });
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "us-morgan-1881-cc" }),
  ).toMatchObject({ held: 2 });
});

test("the Collection searches, filters, sorts and lists linked Items by their resolved facts", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
    country: "NO",
    year: 1875,
  });
  await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "My Morgan",
    catalogEntryKey: "us-morgan-1881-cc",
  });
  const browse = (view: object) =>
    ada.as.query(api.collection.browse, { view, page: 1, pageSize: 25 });
  const titles = async (view: object) =>
    (await browse(view)).items.map(({ title }) => title);

  expect(await titles({ search: "dollar" })).toEqual(["My Morgan"]);
  expect(await titles({ country: "US" })).toEqual(["My Morgan"]);
  expect(await titles({ denomination: "1 dollar" })).toEqual(["My Morgan"]);
  expect(await titles({ sort: "year" })).toEqual(["Krone", "My Morgan"]);
  const all = await browse({});
  expect(all.options.countries).toEqual(
    expect.arrayContaining([{ country: "US", count: 1 }]),
  );
  expect(all.items.find(({ title }) => title === "My Morgan")).toMatchObject({
    year: 1881,
    denomination: "1 dollar",
    country: "US",
  });
});

test("Album lists show linked Items with their resolved facts", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  const albumId = await ada.as.mutation(api.albums.create, { name: "Dollars" });
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
    albumId,
  });

  const { page } = await ada.as.query(api.albums.items, {
    albumId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(page).toMatchObject([
    { title: "Morgan dollar 1881-CC", year: 1881, denomination: "1 dollar" },
  ]);
});

/** Spot prices as the refresh stores them: silver at 30 dollars a troy ounce, 10 kroner to the dollar. */
const storeSpotPrices = (t: Test) =>
  t.mutation(internal.spotPrices.record, {
    quotedAt: Date.UTC(2026, 9, 9, 12, 0),
    perDollar: {
      XAU: 1 / 2400,
      XAG: 1 / 30,
      NOK: 10,
      SEK: 10.5,
      DKK: 6,
      EUR: 0.8,
      RON: 4,
      GBP: 0.75,
      USD: 1,
      CHF: 0.9,
    },
  });

test("Metal value and the Collection totals count a linked Item's metal from its entry", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await storeSpotPrices(t);
  const itemId = await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 2,
  });

  // 26.73 g × 0.9 × 2 = 48.114 g of silver, at 300 kroner a troy ounce
  // (31.1034768 g): 464.07 kroner.
  expect(await ada.as.query(api.metalValues.ofItem, { itemId })).toMatchObject({
    amount: 46407,
    currency: "NOK",
  });
  const {
    page: [totals],
  } = await ada.as.query(api.collectionTotals.page, {
    paginationOpts: { numItems: 500, cursor: null },
    utcOffsetMinutes: 0,
  });
  expect(totals?.metals.silver.fineWeight).toBeCloseTo(48.114, 6);
  expect(totals?.metals.silver.value).toBe(46407);
});

test("the Item list shows linked Items with their resolved facts", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
  });

  const { page } = await ada.as.query(api.items.list, {
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(page).toMatchObject([{ year: 1881, series: "Morgan dollar" }]);
});

test("the Item form reads a Catalog entry's facts as an Item would take them", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);

  expect(
    await ada.as.query(api.items.catalogEntry, { key: "us-morgan-1881-cc" }),
  ).toEqual({
    key: "us-morgan-1881-cc",
    title: "Morgan dollar 1881-CC",
    itemType: "coin",
    facts: {
      country: "US",
      year: 1881,
      denomination: "1 dollar",
      series: "Morgan dollar",
      material: "silver",
      strike: "circulation",
      diameter: 38.1,
      numistaNumber: 1492,
      metal: "silver",
      weight: 26.73,
      purity: 0.9,
    },
  });
  expect(await ada.as.query(api.items.catalogEntry, { key: "us" })).toBeNull();
  await expect(
    t.query(api.items.catalogEntry, { key: "us-morgan-1881-cc" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
});

test("while the Catalog is hidden, only admins add from it; linked Items keep their facts", async () => {
  const t = newTest();
  const { admin, ada } = await withCatalog(t);
  const itemId = await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
  });

  await admin.as.mutation(api.featureFlags.set, {
    flag: { key: "catalogVisible", value: false },
  });

  const picked = {
    type: "coin" as const,
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
  };
  await expect(ada.as.mutation(api.items.add, picked)).rejects.toThrow(
    "CATALOG_ENTRY_NOT_FOUND",
  );
  await expect(
    ada.as.mutation(api.items.quickAdd, {
      catalogEntryKey: "us-morgan-1881-cc",
    }),
  ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
  expect(
    await ada.as.query(api.items.catalogEntry, { key: "us-morgan-1881-cc" }),
  ).toBeNull();
  expect(await ada.as.query(api.items.get, { itemId })).toMatchObject({
    denomination: "1 dollar",
    year: 1881,
  });

  await admin.as.mutation(api.items.add, picked);
  await admin.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
  });
});

test("the Overview's latest Items show a linked Item's year and denomination from its entry", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
  });

  expect(await ada.as.query(api.overview.latestItems, {})).toMatchObject([
    { title: "Morgan dollar 1881-CC", year: 1881, denomination: "1 dollar" },
  ]);
});

test("the Insurance report values and lists a linked Item with its entry's facts", async () => {
  const t = newTest();
  const { ada } = await withCatalog(t);
  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId: ada.userId,
      polarId: "sub_ada",
      polarCustomerId: "cus_ada",
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
  await storeSpotPrices(t);
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 2,
  });

  const report = await ada.as.query(internal.insuranceReport.contents, {
    scope: { kind: "collection" },
    columns: ["metalValue"],
  });
  expect(report.rows).toMatchObject([
    {
      title: "Morgan dollar 1881-CC",
      year: 1881,
      denomination: "1 dollar",
      strike: "circulation",
      values: { metalValue: 46407 },
    },
  ]);
});
