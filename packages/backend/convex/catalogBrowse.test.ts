/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { heldItemLimit } from "./catalog/browse";
import { formatCsvRecord } from "./catalog/csvText";
import { catalogPageSize } from "./catalog/fields";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;
type Caller = ReturnType<Test["withIdentity"]>;

/** A signed-in person; `admin` gives them the admin role, `setUp: false` leaves sign-up unfinished. */
async function person(
  t: Test,
  email: string,
  extra: { admin?: boolean; setUp?: boolean; country?: string } = {},
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
      ...(extra.country && { country: extra.country }),
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

/**
 * Gives a person an Item made from a Catalog entry. Adding Items from the
 * Catalog comes later (MUS-708); until then the link is set directly.
 */
async function holdItem(
  t: Test,
  ownerId: Id<"users">,
  entryKey: string,
  quantity = 1,
) {
  await t.run(async (ctx) => {
    const entry = await ctx.db
      .query("catalogNodes")
      .withIndex("by_key", (q) => q.eq("key", entryKey))
      .unique();
    if (!entry) throw new Error(`No Catalog entry ${entryKey}`);
    await ctx.db.insert("items", {
      ownerId,
      type: "coin",
      title: entry.title,
      quantity,
      catalogEntryId: entry._id,
    });
  });
}

/** A country root. */
const country = (id: string, title: string, code: string): Row => ({
  id,
  title,
  country: code,
});

/** A grouping below `parent`. */
const grouping = (id: string, parent: string, extra: Row = {}): Row => ({
  id,
  parent_id: parent,
  title: id,
  ...extra,
});

/** A coin Catalog entry below `parent`, its facts credited to a source. */
const entry = (id: string, parent: string, extra: Row = {}): Row => ({
  id,
  parent_id: parent,
  title: id,
  item_type: "coin",
  is_addable: "true",
  facts_source: "Test source",
  facts_author: "Test source",
  facts_licence: "Public domain",
  facts_link: "https://example.org/facts",
  ...extra,
});

test("roots are countries and Themes with their entry counts, most entries first", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("se", "Sweden", "SE"),
    country("no", "Norway", "NO"),
    grouping("no-krone", "no"),
    entry("no-krone-1875", "no-krone"),
    entry("no-krone-1876", "no-krone"),
    entry("no-ore-1875", "no"),
    { id: "euro2", title: "2-euro commemoratives" },
    grouping("euro2-de", "euro2", { country: "DE" }),
    entry("euro2-de-2006", "euro2-de"),
    entry("euro2-de-2007", "euro2-de"),
  ]);

  expect(await ada.as.query(api.catalog.browse.roots, {})).toEqual([
    {
      key: "no",
      kind: "country",
      title: "Norway",
      country: "NO",
      countryNode: true,
      entryCount: 3,
    },
    {
      key: "euro2",
      kind: "theme",
      title: "2-euro commemoratives",
      countryNode: false,
      entryCount: 2,
    },
    {
      key: "se",
      kind: "country",
      title: "Sweden",
      country: "SE",
      countryNode: true,
      entryCount: 0,
    },
  ]);
});

test("entry counts follow imports that add entries, move groupings and turn entries into groupings", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("no", "Norway", "NO"),
    country("se", "Sweden", "SE"),
    grouping("no-krone", "no"),
    entry("no-krone-1875", "no-krone"),
    entry("no-krone-1876", "no-krone"),
    entry("no-ore-1875", "no"),
  ]);
  const counts = async () =>
    Object.fromEntries(
      (await ada.as.query(api.catalog.browse.roots, {})).map((root) => [
        root.key,
        root.entryCount,
      ]),
    );
  expect(await counts()).toEqual({ no: 3, se: 0 });

  // The krone grouping moves to Sweden, taking its entries along, and gains one.
  await importRows(admin.as, [
    { id: "no-krone", parent_id: "se", title: "Krone" },
    entry("no-krone-1877", "no-krone"),
  ]);
  expect(await counts()).toEqual({ no: 1, se: 3 });

  // An entry becomes a grouping with an entry of its own below it.
  await importRows(admin.as, [
    { id: "no-ore-1875", parent_id: "no", title: "Øre", is_addable: "false" },
    entry("no-ore-1875-a", "no-ore-1875"),
    entry("no-ore-1875-b", "no-ore-1875"),
  ]);
  expect(await counts()).toEqual({ no: 2, se: 3 });

  // Re-importing what's there changes nothing.
  await importRows(admin.as, [
    country("no", "Norway", "NO"),
    entry("no-krone-1875", "no-krone"),
  ]);
  expect(await counts()).toEqual({ no: 2, se: 3 });
});

test("a Theme opens to its countries, most entries first, each browsed by its own key", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    { id: "euro2", title: "2-euro commemoratives" },
    grouping("euro2-fi", "euro2", { title: "Finland", country: "FI" }),
    entry("euro2-fi-2004", "euro2-fi"),
    grouping("euro2-de", "euro2", { title: "Germany", country: "DE" }),
    entry("euro2-de-2006", "euro2-de"),
    entry("euro2-de-2007", "euro2-de"),
  ]);

  expect(
    await ada.as.query(api.catalog.browse.node, { key: "euro2" }),
  ).toMatchObject({
    kind: "theme",
    title: "2-euro commemoratives",
    entryCount: 3,
    ancestors: [],
    countryNode: false,
    groupings: [
      {
        key: "euro2-de",
        kind: "grouping",
        title: "Germany",
        country: "DE",
        entryCount: 2,
      },
      {
        key: "euro2-fi",
        kind: "grouping",
        title: "Finland",
        country: "FI",
        entryCount: 1,
      },
    ],
  });
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "euro2-de" }),
  ).toMatchObject({
    kind: "grouping",
    title: "Germany",
    ancestors: [{ key: "euro2", title: "2-euro commemoratives" }],
    countryNode: true,
    groupings: [],
  });
});

test("countries say so wherever they show, so the app names them in the reader's language", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("us", "United States", "US"),
    grouping("us-morgan", "us", { title: "Morgan dollar", country: "US" }),
    entry("us-morgan-1881", "us-morgan", { country: "US" }),
    entry("us-morgan-1882", "us-morgan", { country: "US" }),
    { id: "euro2", title: "2-euro commemoratives" },
    grouping("euro2-de", "euro2", { title: "Germany", country: "DE" }),
    entry("euro2-de-2006", "euro2-de", { country: "DE" }),
  ]);
  const countryNodes = (rows: Array<{ key: string; countryNode: boolean }>) =>
    rows.filter((row) => row.countryNode).map((row) => row.key);

  // A country at the top, and a Theme's country, are countries…
  const roots = await ada.as.query(api.catalog.browse.roots, {});
  expect(countryNodes(roots)).toEqual(["us"]);
  const theme = await ada.as.query(api.catalog.browse.node, { key: "euro2" });
  expect(
    theme && "groupings" in theme && countryNodes(theme.groupings),
  ).toEqual(["euro2-de"]);
  // …a grouping of a country's coins isn't, though it has the country too.
  const usa = await ada.as.query(api.catalog.browse.node, { key: "us" });
  expect(usa && "groupings" in usa && countryNodes(usa.groupings)).toEqual([]);

  // The way down to an entry names its country by code.
  const entryDetail = await ada.as.query(api.catalog.browse.node, {
    key: "euro2-de-2006",
  });
  expect(entryDetail?.ancestors).toEqual([
    {
      key: "euro2",
      title: "2-euro commemoratives",
      countryNode: false,
    },
    { key: "euro2-de", title: "Germany", country: "DE", countryNode: true },
  ]);

  // So does a country viewed as a Set.
  expect(await ada.as.query(api.catalog.sets.get, { key: "us" })).toMatchObject(
    { title: "United States", country: "US", countryNode: true },
  );

  // And a country found by searching, in any language.
  const found = await ada.as.query(api.catalog.search.find, {
    text: "Deutschland",
  });
  expect(
    found.groups.flatMap((group) =>
      group.nodes.map(({ key, countryNode }) => ({ key, countryNode })),
    ),
  ).toContainEqual({ key: "euro2-de", countryNode: true });
});

test("a key that isn't in the Catalog reads as not found", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "nowhere" }),
  ).toBeNull();
});

test("an entry's detail shows its facts, notes, image and Numista number with their sources, and how many the person holds", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const grace = await person(t, "grace@example.com");
  await importRows(admin.as, [
    country("us", "United States", "US"),
    grouping("us-morgan", "us", { title: "Morgan dollar" }),
    entry("us-morgan-1881-s", "us-morgan", {
      title: "Morgan dollar 1881-S",
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
      facts_source: "United States Mint",
      facts_author: "United States Mint",
      facts_licence: "Public domain",
      facts_link: "https://www.usmint.gov/",
      technical_details: "Mint: San Francisco.",
      historical_notes: "Struck under the Bland-Allison Act.",
      notes_source: "CoinsLite editorial",
      notes_author: "CoinsLite",
      notes_licence: "CoinsLite",
      notes_link: "https://www.usmint.gov/",
      image_url: "https://images.example.com/morgan-1881-s.jpg",
      image_source: "Example Museum",
      image_author: "A. Photographer",
      image_licence: "CC BY 4.0",
      image_link: "https://example.com/morgan",
      numista_id: "1492",
    }),
  ]);
  await holdItem(t, ada.userId, "us-morgan-1881-s", 2);
  await holdItem(t, ada.userId, "us-morgan-1881-s", 1);
  await holdItem(t, grace.userId, "us-morgan-1881-s", 5);
  // An Item entered by hand isn't linked, even with the same title.
  await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Morgan dollar 1881-S",
  });

  const detail = await ada.as.query(api.catalog.browse.node, {
    key: "us-morgan-1881-s",
  });
  expect(detail).toEqual({
    key: "us-morgan-1881-s",
    kind: "entry",
    title: "Morgan dollar 1881-S",
    itemType: "coin",
    country: "US",
    denomination: "1 dollar",
    series: "Morgan dollar",
    material: "silver",
    strike: "circulation",
    metal: "silver",
    weight: 26.73,
    fineness: 0.9,
    diameter: 38.1,
    yearFrom: 1881,
    yearTo: 1881,
    technicalDetails: "Mint: San Francisco.",
    historicalNotes: "Struck under the Bland-Allison Act.",
    factsProvenance: {
      source: "United States Mint",
      author: "United States Mint",
      licence: "Public domain",
      link: "https://www.usmint.gov/",
    },
    notesProvenance: {
      source: "CoinsLite editorial",
      author: "CoinsLite",
      licence: "CoinsLite",
      link: "https://www.usmint.gov/",
    },
    imageUrl: "https://images.example.com/morgan-1881-s.jpg",
    // A linked image has one size.
    thumbnailUrl: "https://images.example.com/morgan-1881-s.jpg",
    imageProvenance: {
      source: "Example Museum",
      author: "A. Photographer",
      licence: "CC BY 4.0",
      link: "https://example.com/morgan",
    },
    numistaId: 1492,
    held: 3,
    heldMore: false,
    ancestors: [
      { key: "us", title: "United States", country: "US", countryNode: true },
      { key: "us-morgan", title: "Morgan dollar", countryNode: false },
    ],
  });
  expect(
    await grace.as.query(api.catalog.browse.node, { key: "us-morgan-1881-s" }),
  ).toMatchObject({ held: 5 });
});

test("walking a grouping lists its entries by year, then sort order, in pages of 50, with how many the person holds", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  // 60 entries, two a year from 1901 to 1930, filed in reverse.
  const entries = Array.from({ length: 60 }, (_, index) => {
    const year = 1930 - Math.floor(index / 2);
    return entry(`no-krone-${year}-${index % 2 ? "a" : "b"}`, "no-krone", {
      year_from: String(year),
      sort_order: String(index % 2 ? 1 : 2),
    });
  });
  await importRows(admin.as, [
    country("no", "Norway", "NO"),
    grouping("no-krone", "no"),
    ...entries,
  ]);
  await holdItem(t, ada.userId, "no-krone-1901-a", 4);

  const first = await ada.as.query(api.catalog.browse.entries, {
    key: "no-krone",
    paginationOpts: { numItems: catalogPageSize, cursor: null },
  });
  expect(first.page).toHaveLength(50);
  expect(first.page.slice(0, 3)).toEqual([
    expect.objectContaining({
      key: "no-krone-1901-a",
      yearFrom: 1901,
      held: 4,
    }),
    expect.objectContaining({
      key: "no-krone-1901-b",
      yearFrom: 1901,
      held: 0,
    }),
    expect.objectContaining({ key: "no-krone-1902-a", yearFrom: 1902 }),
  ]);
  expect(first.isDone).toBe(false);

  const rest = await ada.as.query(api.catalog.browse.entries, {
    key: "no-krone",
    paginationOpts: { numItems: catalogPageSize, cursor: first.continueCursor },
  });
  expect(rest.page.map((row) => row.key)).toEqual([
    "no-krone-1926-a",
    "no-krone-1926-b",
    "no-krone-1927-a",
    "no-krone-1927-b",
    "no-krone-1928-a",
    "no-krone-1928-b",
    "no-krone-1929-a",
    "no-krone-1929-b",
    "no-krone-1930-a",
    "no-krone-1930-b",
  ]);
  expect(rest.isDone).toBe(true);
});

test("a grouping's own groupings come in sort order, and the entries beside them are listed apart", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("us", "United States", "US"),
    grouping("us-peace", "us", { title: "Peace dollar", sort_order: "2" }),
    grouping("us-morgan", "us", { title: "Morgan dollar", sort_order: "1" }),
    entry("us-morgan-1878", "us-morgan"),
    entry("us-trade-1873", "us", { year_from: "1873" }),
  ]);

  const us = await ada.as.query(api.catalog.browse.node, { key: "us" });
  expect(us).toMatchObject({
    kind: "country",
    countryNode: true,
    entryCount: 2,
    groupings: [
      { key: "us-morgan", title: "Morgan dollar", entryCount: 1 },
      { key: "us-peace", title: "Peace dollar", entryCount: 0 },
    ],
  });
  const entries = await ada.as.query(api.catalog.browse.entries, {
    key: "us",
    paginationOpts: { numItems: catalogPageSize, cursor: null },
  });
  expect(entries.page.map((row) => row.key)).toEqual(["us-trade-1873"]);
});

test("a country's denominations sort by face value, minor units as hundredths, with entries lacking one grouped last", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("no", "Norway", "NO"),
    grouping("no-modern", "no"),
    entry("no-10-kroner-1995", "no-modern", { denomination: "10 kroner" }),
    entry("no-1-krone-1997", "no-modern", { denomination: "1 krone" }),
    entry("no-1-krone-1875", "no", {
      denomination: "1 krone",
      series: "Oscar II",
    }),
    entry("no-25-ore-1921", "no-modern", { denomination: "25 øre" }),
    entry("no-2-ore-1876", "no", { denomination: "2 øre" }),
    entry("no-half-krone-1876", "no", { denomination: "½ krone" }),
    entry("no-5-kroner-1963", "no", { denomination: "5 kroner" }),
    entry("no-medal-1905", "no"),
    // Another country's entries stay out.
    country("us", "United States", "US"),
    entry("us-cent-1909", "us", { denomination: "1 cent" }),
  ]);

  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "no" }),
  ).toEqual([
    { denomination: "2 øre", seriesCount: 1 },
    { denomination: "25 øre", seriesCount: 1 },
    { denomination: "½ krone", seriesCount: 1 },
    { denomination: "1 krone", seriesCount: 2 },
    { denomination: "5 kroner", seriesCount: 1 },
    { denomination: "10 kroner", seriesCount: 1 },
    { denomination: null, seriesCount: 1 },
  ]);
});

test("a denomination's series sort by first year, with entries lacking one grouped last", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const krone = (id: string, series: string | undefined, year: number) =>
    entry(id, "no", {
      denomination: "1 krone",
      ...(series && { series }),
      year_from: String(year),
      year_to: String(year),
    });
  await importRows(admin.as, [
    country("no", "Norway", "NO"),
    krone("no-1-krone-1958", "Olav V", 1958),
    krone("no-1-krone-1973", "Olav V", 1973),
    krone("no-1-krone-1910", "Haakon VII", 1910),
    krone("no-1-krone-1957", "Haakon VII", 1957),
    krone("no-1-krone-1877", "Oscar II", 1877),
    krone("no-1-krone-1875", "Oscar II", 1875),
    krone("no-1-krone-1940", undefined, 1940),
    entry("no-1-krone-1875-proof", "no", {
      denomination: "1 krone",
      series: "Oscar II",
    }),
    entry("no-50-ore-1996", "no", { denomination: "50 øre" }),
  ]);

  expect(
    await ada.as.query(api.catalog.browse.series, {
      key: "no",
      denomination: "1 krone",
    }),
  ).toEqual([
    { series: "Oscar II", firstYear: 1875, lastYear: 1877 },
    { series: "Haakon VII", firstYear: 1910, lastYear: 1957 },
    { series: "Olav V", firstYear: 1958, lastYear: 1973 },
    { series: null, firstYear: 1940, lastYear: 1940 },
  ]);
  expect(
    await ada.as.query(api.catalog.browse.series, {
      key: "no",
      denomination: null,
    }),
  ).toEqual([]);
});

test("a Theme's country is browsed by denomination on its own, apart from the country's root", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const twoEuro = { denomination: "2 euro", series: "Bundesländer" };
  await importRows(admin.as, [
    { id: "euro2", title: "2-euro commemoratives" },
    grouping("euro2-de", "euro2", { title: "Germany", country: "DE" }),
    entry("euro2-de-2006", "euro2-de", { ...twoEuro, year_from: "2006" }),
    entry("euro2-de-2007", "euro2-de", { ...twoEuro, year_from: "2007" }),
    country("de", "Germany", "DE"),
    entry("de-2-euro-2002", "de", { ...twoEuro, year_from: "2002" }),
  ]);

  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "euro2-de" }),
  ).toEqual([{ denomination: "2 euro", seriesCount: 1 }]);
  expect(
    await ada.as.query(api.catalog.browse.series, {
      key: "euro2-de",
      denomination: "2 euro",
    }),
  ).toEqual([{ series: "Bundesländer", firstYear: 2006, lastYear: 2007 }]);
  // The Theme itself isn't a country.
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "euro2" }),
  ).toEqual([]);
});

test("the denomination path ends in the entries of one series by year, then sort order, including the groups without either", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("us", "United States", "US"),
    grouping("us-morgan", "us"),
    entry("us-morgan-1881-s", "us-morgan", {
      denomination: "1 dollar",
      series: "Morgan dollar",
      year_from: "1881",
      sort_order: "3",
    }),
    entry("us-morgan-1881", "us-morgan", {
      denomination: "1 dollar",
      series: "Morgan dollar",
      year_from: "1881",
      sort_order: "1",
    }),
    entry("us-morgan-1878", "us-morgan", {
      denomination: "1 dollar",
      series: "Morgan dollar",
      year_from: "1878",
      sort_order: "9",
    }),
    entry("us-trade-1873", "us", {
      denomination: "1 dollar",
      year_from: "1873",
    }),
    entry("us-token", "us"),
  ]);
  await holdItem(t, ada.userId, "us-morgan-1881", 2);
  const page = async (denomination: string | null, series: string | null) =>
    (
      await ada.as.query(api.catalog.browse.seriesEntries, {
        key: "us",
        denomination,
        series,
        paginationOpts: { numItems: catalogPageSize, cursor: null },
      })
    ).page.map((row) => [row.key, row.held]);

  expect(await page("1 dollar", "Morgan dollar")).toEqual([
    ["us-morgan-1878", 0],
    ["us-morgan-1881", 2],
    ["us-morgan-1881-s", 0],
  ]);
  expect(await page("1 dollar", null)).toEqual([["us-trade-1873", 0]]);
  expect(await page(null, null)).toEqual([["us-token", 0]]);
});

test("browsing needs a signed-in person who has finished signing up", async () => {
  const t = newTest();
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const paginationOpts = { numItems: catalogPageSize, cursor: null };
  const calls = [
    (as: Test | Caller) => as.query(api.catalog.browse.roots, {}),
    (as: Test | Caller) => as.query(api.catalog.browse.node, { key: "us" }),
    (as: Test | Caller) =>
      as.query(api.catalog.browse.entries, { key: "us", paginationOpts }),
    (as: Test | Caller) =>
      as.query(api.catalog.browse.denominations, { key: "us" }),
    (as: Test | Caller) =>
      as.query(api.catalog.browse.series, { key: "us", denomination: null }),
    (as: Test | Caller) =>
      as.query(api.catalog.browse.seriesEntries, {
        key: "us",
        denomination: null,
        series: null,
        paginationOpts,
      }),
  ];
  for (const call of calls) {
    await expect(call(t)).rejects.toThrow("NOT_SIGNED_IN");
    await expect(call(newcomer.as)).rejects.toThrow("NOT_SET_UP");
  }
});

test("the bundled US silver dollars browse by series grouping and by denomination", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.mutation(internal.catalog.seed.load, {});

  expect(await ada.as.query(api.catalog.browse.roots, {})).toContainEqual(
    expect.objectContaining({ key: "us", entryCount: 120 }),
  );
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "us" }),
  ).toMatchObject({
    countryNode: true,
    groupings: [
      { key: "us-morgan-dollar", entryCount: 96 },
      { key: "us-peace-dollar", entryCount: 24 },
    ],
  });
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "us" }),
  ).toEqual([{ denomination: "1 dollar", seriesCount: 2 }]);
  expect(
    await ada.as.query(api.catalog.browse.series, {
      key: "us",
      denomination: "1 dollar",
    }),
  ).toEqual([
    { series: "Morgan dollar", firstYear: 1878, lastYear: 1921 },
    { series: "Peace dollar", firstYear: 1921, lastYear: 1935 },
  ]);
});

test("loading the bundled datasets fills in browsing for Catalog data stored before it existed, a batch at a time", async () => {
  vi.useFakeTimers();
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.mutation(internal.catalog.seed.load, {});
  // As stored before browsing: no entry counts, no countries to browse by.
  await t.run(async (ctx) => {
    for await (const node of ctx.db.query("catalogNodes")) {
      await ctx.db.patch(node._id, {
        entryCount: undefined,
        countryNodeKey: undefined,
      });
    }
  });
  expect(await ada.as.query(api.catalog.browse.roots, {})).toContainEqual(
    expect.objectContaining({ key: "us", entryCount: 0 }),
  );

  await t.mutation(internal.catalog.seed.load, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await ada.as.query(api.catalog.browse.roots, {})).toContainEqual(
    expect.objectContaining({ key: "us", entryCount: 120 }),
  );
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "us" }),
  ).toEqual([{ denomination: "1 dollar", seriesCount: 2 }]);
  // Over 700 nodes: more than one transaction refreshes.
  const refreshes = await t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect()).filter(
      (job) => job.name.includes("refreshBrowseFields"),
    ),
  );
  expect(refreshes.length).toBeGreaterThan(1);
  vi.useRealTimers();
});

test("a root that becomes a country once it gets a country code is browsed by denomination from then on", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  // Without a country code the root reads as a Theme.
  await importRows(admin.as, [
    { id: "de", title: "Germany" },
    grouping("de-mark", "de"),
    entry("de-mark-1950", "de-mark", { denomination: "1 Mark" }),
  ]);
  const denominationsOf = (key: string) =>
    ada.as.query(api.catalog.browse.denominations, { key });
  expect(await denominationsOf("de")).toEqual([]);
  expect(await denominationsOf("de-mark")).toEqual([
    { denomination: "1 Mark", seriesCount: 1 },
  ]);

  await importRows(admin.as, [country("de", "Germany", "DE")]);
  expect(await denominationsOf("de")).toEqual([
    { denomination: "1 Mark", seriesCount: 1 },
  ]);
  expect(await denominationsOf("de-mark")).toEqual([]);
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "de" }),
  ).toMatchObject({ kind: "country", countryNode: true, entryCount: 1 });
});

test("how many someone holds is counted over a bounded number of Items, and says when there are more", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    country("us", "United States", "US"),
    entry("us-morgan-1881-s", "us"),
  ]);
  const held = async () => {
    const node = await ada.as.query(api.catalog.browse.node, {
      key: "us-morgan-1881-s",
    });
    return node?.kind === "entry" ? [node.held, node.heldMore] : null;
  };

  for (let n = 0; n < heldItemLimit; n++)
    await holdItem(t, ada.userId, "us-morgan-1881-s", 2);
  expect(await held()).toEqual([2 * heldItemLimit, false]);

  await holdItem(t, ada.userId, "us-morgan-1881-s", 2);
  expect(await held()).toEqual([2 * heldItemLimit, true]);
});
