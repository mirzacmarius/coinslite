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
async function person(
  t: Test,
  email: string,
  extra: { setUp?: boolean; country?: string } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
      ...(extra.country && { country: extra.country }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Person = Awaited<ReturnType<typeof person>>;
type NewItem = FunctionArgs<typeof api.items.add>;
type Browse = FunctionArgs<typeof api.collection.browse>;

/** Adds Items one after another, so they're added in the order given. */
async function addAll(who: Person, items: NewItem[]) {
  const ids = [];
  for (const item of items)
    ids.push(await who.as.mutation(api.items.add, item));
  return ids;
}

const coin = (title: string, extra: Partial<NewItem> = {}): NewItem => ({
  type: "coin",
  title,
  ...extra,
});

/** The titles on one page of the Collection, as browsed with these settings. */
async function titles(
  who: Person,
  view: Browse["view"] = {},
  options: Partial<Omit<Browse, "view">> = {},
) {
  const result = await who.as.query(api.collection.browse, {
    view,
    page: 1,
    pageSize: 50,
    ...options,
  });
  return result.items.map((item) => item.title);
}

test("the Collection is sorted by year, oldest first, with undated Items last", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Undated token"),
    coin("Krone 1875", { year: 1875 }),
    coin("Krone 1908", { year: 1908 }),
    coin("Denarius", { year: -44 }),
  ]);

  expect(await titles(ada)).toEqual([
    "Denarius",
    "Krone 1875",
    "Krone 1908",
    "Undated token",
  ]);
});

test("Items with the same year keep a steady order: by title, then as added", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Krone", { year: 1875 }),
    coin("Ørtug", { year: 1875 }),
    coin("Krone", { year: 1875, notes: "second" }),
    coin("Daler", { year: 1875 }),
  ]);

  const { items } = await ada.as.query(api.collection.browse, {
    view: {},
    page: 1,
    pageSize: 15,
    locale: "nb",
  });
  expect(items.map((item) => [item.title, item.notes])).toEqual([
    ["Daler", undefined],
    ["Krone", undefined],
    ["Krone", "second"],
    ["Ørtug", undefined],
  ]);
});

test("the Collection can be sorted newest added first, or oldest added first", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("First", { year: 2000 }),
    coin("Second", { year: 1900 }),
    coin("Third"),
  ]);

  expect(await titles(ada, { sort: "newest" })).toEqual([
    "Third",
    "Second",
    "First",
  ]);
  expect(await titles(ada, { sort: "oldest" })).toEqual([
    "First",
    "Second",
    "Third",
  ]);
});

test("sorting by Purchase price puts the highest per piece first and unpriced Items last", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Unpriced"),
    coin("Cheap lot", { purchasePrice: 1_000, quantity: 50 }),
    coin("Dear", { purchasePrice: 250_000 }),
    coin("Middling", { purchasePrice: 9_900 }),
  ]);

  expect(await titles(ada, { sort: "price" })).toEqual([
    "Dear",
    "Middling",
    "Cheap lot",
    "Unpriced",
  ]);
});

test("sorting by Grade puts the best first across Grading scales, ungraded Items last", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Ungraded"),
    coin("Very fine", { grade: "VF", gradingScale: "european" }),
    coin("Mint state 65", { grade: "65", gradingScale: "sheldon" }),
    {
      type: "stamp",
      title: "Used stamp",
      grade: "used",
      gradingScale: "stamp",
    },
    coin("Norwegian 0", { grade: "0", gradingScale: "norwegian" }),
    coin("Good", { grade: "G", gradingScale: "european" }),
  ]);

  expect(await titles(ada, { sort: "grade" })).toEqual([
    "Norwegian 0",
    "Mint state 65",
    "Very fine",
    "Good",
    "Used stamp",
    "Ungraded",
  ]);
});

test("sorting by denomination goes by face value, minor units as hundredths, Items without one last", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("No denomination"),
    coin("Ten kroner", { denomination: "10 kroner" }),
    coin("Half krone", { denomination: "½ krone" }),
    coin("Two øre", { denomination: "2 øre" }),
    coin("One krone", { denomination: "1 krone" }),
    coin("Twenty-five øre", { denomination: "25 øre" }),
  ]);

  expect(await titles(ada, { sort: "denomination" })).toEqual([
    "Two øre",
    "Twenty-five øre",
    "Half krone",
    "One krone",
    "Ten kroner",
    "No denomination",
  ]);
});

test("search finds Items by title, denomination or country, every word anywhere", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Haakon VII", { country: "NO", denomination: "2 kroner", year: 1910 }),
    coin("Krone 1875", { country: "DK", denomination: "1 krone", year: 1875 }),
    coin("Morgan dollar", {
      country: "US",
      denomination: "1 dollar",
      year: 1881,
    }),
    coin("Öre coin", { country: "SE", denomination: "1 öre", year: 1900 }),
  ]);
  const search = (text: string, locale: "en" | "nb" = "en") =>
    titles(ada, { search: text }, { locale });

  expect(await search("kron")).toEqual(["Krone 1875", "Haakon VII"]);
  expect(await search("  KRONER ")).toEqual(["Haakon VII"]);
  expect(await search("Norway")).toEqual(["Haakon VII"]);
  expect(await search("norge", "nb")).toEqual(["Haakon VII"]);
  expect(await search("danm", "nb")).toEqual(["Krone 1875"]);
  expect(await search("us")).toEqual(["Morgan dollar"]);
  expect(await search("dollar morgan")).toEqual(["Morgan dollar"]);
  expect(await search("haakon kroner")).toEqual(["Haakon VII"]);
  expect(await search("haakon dollar")).toEqual([]);
  expect(await search("ore")).toEqual(["Öre coin"]);
  expect(await search("")).toHaveLength(4);
});

test("filtering by Item type, and to bullion coins only", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Krone", { year: 1875 }),
    coin("Krugerrand", { year: 1980, bullion: true, metal: "gold" }),
    { type: "banknote", title: "100 kroner note", year: 1950 },
    { type: "stamp", title: "Posthorn", year: 1872 },
  ]);

  expect(await titles(ada, { type: "coin" })).toEqual(["Krone", "Krugerrand"]);
  expect(await titles(ada, { type: "banknote" })).toEqual(["100 kroner note"]);
  expect(await titles(ada, { type: "stamp" })).toEqual(["Posthorn"]);
  expect(await titles(ada, { type: "coin", bullionOnly: true })).toEqual([
    "Krugerrand",
  ]);
  // Only coins are bullion, so bullion-only means coins whatever the type.
  expect(await titles(ada, { bullionOnly: true })).toEqual(["Krugerrand"]);
});

const worldCoins = [
  coin("Krone", { country: "NO", year: 1875 }),
  coin("Krona", { country: "SE", year: 1880 }),
  coin("Dollar", { country: "US", year: 1881 }),
  coin("Token", { year: 1890 }),
];

test("origin narrows to the person's own country, from their address, or to foreign Items", async () => {
  const t = newTest();
  const bo = await person(t, "bo@example.com", { country: "SE" });
  await addAll(bo, worldCoins);

  expect(await titles(bo, { origin: "own" })).toEqual(["Krona"]);
  // Items without a country are neither.
  expect(await titles(bo, { origin: "foreign" })).toEqual(["Krone", "Dollar"]);
});

test("without an address, the own country is the Home currency's", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com"); // NOK
  await addAll(ada, worldCoins);

  const result = await ada.as.query(api.collection.browse, {
    view: { origin: "own" },
    page: 1,
    pageSize: 15,
  });
  expect(result.ownCountry).toBe("NO");
  expect(result.items.map((item) => item.title)).toEqual(["Krone"]);
});

test("a euro Home currency names no country, so origin can't narrow without an address", async () => {
  const t = newTest();
  const cy = await person(t, "cy@example.com");
  await t.run((ctx) => ctx.db.patch(cy.userId, { homeCurrency: "EUR" }));
  await addAll(cy, worldCoins);

  const result = await cy.as.query(api.collection.browse, {
    view: { origin: "own" },
    page: 1,
    pageSize: 15,
  });
  expect(result.ownCountry).toBeNull();
  expect(result.items).toHaveLength(4);
});

test("filtering to one country", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, worldCoins);

  expect(await titles(ada, { country: "SE" })).toEqual(["Krona"]);
  expect(await titles(ada, { country: "se" })).toEqual(["Krona"]);
  expect(await titles(ada, { country: "FR" })).toEqual([]);
});

test("filtering to one denomination, whatever its capitals and spacing", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Krone 1875", { denomination: "1 krone", year: 1875 }),
    coin("Krone 1876", { denomination: "1 Krone", year: 1876 }),
    coin("Two kroner", { denomination: "2 kroner", year: 1877 }),
    coin("No denomination", { year: 1878 }),
  ]);

  expect(await titles(ada, { denomination: " 1 KRONE " })).toEqual([
    "Krone 1875",
    "Krone 1876",
  ]);
});

test("filtering to one Grade on one Grading scale", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(ada, [
    coin("Euro XF", { grade: "XF", gradingScale: "european", year: 1 }),
    {
      type: "banknote",
      title: "International XF",
      grade: "XF",
      gradingScale: "international",
      year: 2,
    },
    coin("Euro VF", { grade: "VF", gradingScale: "european", year: 3 }),
    coin("Ungraded", { year: 4 }),
  ]);

  expect(
    await titles(ada, { grade: { gradingScale: "european", grade: "XF" } }),
  ).toEqual(["Euro XF"]);
});

test("filtering to one Album, or to Items without an Album", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "teal",
  });
  const gifts = await ada.as.mutation(api.albums.create, {
    name: "Gifts",
    colour: "red",
  });
  await addAll(ada, [
    coin("From Rome", { albumId: travel, year: 1 }),
    coin("From Oslo", { albumId: travel, year: 2 }),
    coin("From Grandma", { albumId: gifts, year: 3 }),
    coin("Loose", { year: 4 }),
  ]);

  expect(await titles(ada, { album: travel })).toEqual([
    "From Rome",
    "From Oslo",
  ]);
  expect(await titles(ada, { album: "none" })).toEqual(["Loose"]);
  expect(await titles(ada, { album: "not-an-album" })).toEqual([]);
});

test("search, filters and sort combine: every filter must hold", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "teal",
  });
  const xf = { grade: "XF", gradingScale: "european" } as const;
  await addAll(ada, [
    coin("Krone A", {
      country: "NO",
      denomination: "1 krone",
      year: 1900,
      purchasePrice: 100,
      albumId: travel,
      ...xf,
    }),
    coin("Krone B", {
      country: "NO",
      denomination: "1 krone",
      year: 1901,
      purchasePrice: 300,
      albumId: travel,
      ...xf,
    }),
    coin("Krone C", {
      country: "NO",
      denomination: "1 krone",
      year: 1902,
      purchasePrice: 200,
      ...xf,
    }),
    coin("Krone D", {
      country: "NO",
      denomination: "2 kroner",
      year: 1903,
      albumId: travel,
      ...xf,
    }),
    coin("Krone E", {
      country: "NO",
      denomination: "1 krone",
      year: 1904,
      albumId: travel,
    }),
    coin("Krone F", {
      country: "DK",
      denomination: "1 krone",
      year: 1905,
      albumId: travel,
      ...xf,
    }),
    {
      type: "banknote",
      title: "Krone note",
      country: "NO",
      denomination: "1 krone",
      year: 1906,
      albumId: travel,
    },
    coin("Daler", {
      country: "NO",
      denomination: "1 krone",
      year: 1907,
      albumId: travel,
      ...xf,
    }),
  ]);

  const everything = {
    search: "krone",
    type: "coin",
    origin: "own",
    country: "NO",
    denomination: "1 krone",
    grade: { gradingScale: "european", grade: "XF" },
    album: travel,
    sort: "price",
  } as const;
  // Daler's denomination is "1 krone"; unpriced, it comes last.
  expect(await titles(ada, everything)).toEqual([
    "Krone B",
    "Krone A",
    "Daler",
  ]);
  expect(await titles(ada, { ...everything, search: "krone daler" })).toEqual([
    "Daler",
  ]);
  expect(
    await titles(ada, { origin: "foreign", album: travel, type: "coin" }),
  ).toEqual(["Krone F"]);
  expect(await titles(ada, { country: "DK", origin: "own" })).toEqual([]);
});

test("the Collection comes a page at a time, with how many Items match in all", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await addAll(
    ada,
    Array.from({ length: 40 }, (_, index) =>
      coin(`Coin ${index + 1}`, {
        year: 1900 + index,
        ...(index % 2 === 0 && { country: "NO" }),
      }),
    ),
  );
  const browse = (options: Partial<Browse>) =>
    ada.as.query(api.collection.browse, {
      view: {},
      page: 1,
      pageSize: 15,
      ...options,
    });

  const first = await browse({});
  expect(first).toMatchObject({
    page: 1,
    pageCount: 3,
    total: 40,
    collectionSize: 40,
  });
  expect(first.items.map((item) => item.title)).toEqual(
    Array.from({ length: 15 }, (_, index) => `Coin ${index + 1}`),
  );

  const last = await browse({ page: 3 });
  expect(last.items.map((item) => item.title)).toEqual(
    Array.from({ length: 10 }, (_, index) => `Coin ${index + 31}`),
  );

  const larger = await browse({ page: 2, pageSize: 25 });
  expect(larger).toMatchObject({ page: 2, pageCount: 2 });
  expect(larger.items[0]?.title).toBe("Coin 26");
  expect(larger.items).toHaveLength(15);

  // A page past the end shows the last one; a page before the start the first.
  expect(await browse({ page: 9 })).toMatchObject({ page: 3 });
  expect(await browse({ page: 0 })).toMatchObject({ page: 1 });
  expect(await browse({ page: 2.7 })).toMatchObject({ page: 2 });

  const filtered = await browse({ view: { country: "NO" }, pageSize: 50 });
  expect(filtered).toMatchObject({
    page: 1,
    pageCount: 1,
    total: 20,
    collectionSize: 40,
  });
});

test("nothing matching still makes one empty page", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  expect(
    await ada.as.query(api.collection.browse, {
      view: { search: "anything" },
      page: 4,
      pageSize: 25,
    }),
  ).toMatchObject({
    items: [],
    page: 1,
    pageCount: 1,
    total: 0,
    collectionSize: 0,
  });
});

/** A small Collection with a bit of everything, and its Albums. */
async function mixedCollection(t: Test) {
  const ada = await person(t, "ada@example.com"); // NOK, so own country NO
  const travel = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "teal",
  });
  const gifts = await ada.as.mutation(api.albums.create, {
    name: "Gifts",
    colour: "red",
  });
  const european = (grade: string) =>
    ({ grade, gradingScale: "european" }) as const;
  await addAll(ada, [
    coin("Krone XF", {
      country: "NO",
      denomination: "1 krone",
      albumId: travel,
      ...european("XF"),
    }),
    coin("Krone VF", {
      country: "NO",
      denomination: "1 Krone",
      ...european("VF"),
    }),
    coin("Krona", {
      country: "SE",
      denomination: "1 krona",
      albumId: travel,
      bullion: true,
      ...european("XF"),
    }),
    {
      type: "banknote",
      title: "Hundred",
      country: "NO",
      denomination: "100 kroner",
      albumId: gifts,
      grade: "XF",
      gradingScale: "international",
    },
    { type: "stamp", title: "Posthorn", grade: "used", gradingScale: "stamp" },
  ]);
  return { ada, travel, gifts };
}

test("every filter option comes with how many Items it would show", async () => {
  const t = newTest();
  const { ada, travel, gifts } = await mixedCollection(t);

  const { options } = await ada.as.query(api.collection.browse, {
    view: {},
    page: 1,
    pageSize: 15,
  });

  expect(options).toEqual({
    types: { coin: 3, banknote: 1, stamp: 1, bullion: 1 },
    origins: { own: 3, foreign: 1 },
    countries: [
      { country: "NO", count: 3 },
      { country: "SE", count: 1 },
    ],
    // By face value; spellings of one denomination count together.
    denominations: [
      { denomination: "1 krona", count: 1 },
      { denomination: "1 krone", count: 2 },
      { denomination: "100 kroner", count: 1 },
    ],
    // Scale by scale, best Grade first.
    grades: [
      { gradingScale: "european", grade: "XF", count: 2 },
      { gradingScale: "european", grade: "VF", count: 1 },
      { gradingScale: "international", grade: "XF", count: 1 },
      { gradingScale: "stamp", grade: "used", count: 1 },
    ],
    albums: [
      { albumId: travel, count: 2 },
      { albumId: gifts, count: 1 },
    ],
    withoutAlbum: 2,
  });
});

test("option counts follow the search and the other filters, but not their own", async () => {
  const t = newTest();
  const { ada, travel, gifts } = await mixedCollection(t);
  const optionsFor = async (view: Browse["view"]) =>
    (
      await ada.as.query(api.collection.browse, {
        view,
        page: 1,
        pageSize: 15,
      })
    ).options;

  const coins = await optionsFor({ type: "coin" });
  expect(coins.types).toEqual({ coin: 3, banknote: 1, stamp: 1, bullion: 1 });
  expect(coins.countries).toEqual([
    { country: "NO", count: 2 },
    { country: "SE", count: 1 },
  ]);
  expect(coins.albums).toEqual([{ albumId: travel, count: 2 }]);
  expect(coins.withoutAlbum).toBe(1);

  const norwegianTravel = await optionsFor({ country: "NO", album: travel });
  expect(norwegianTravel.countries).toEqual([
    { country: "NO", count: 1 },
    { country: "SE", count: 1 },
  ]);
  expect(norwegianTravel.albums).toEqual([
    { albumId: travel, count: 1 },
    { albumId: gifts, count: 1 },
  ]);
  expect(norwegianTravel.withoutAlbum).toBe(1);
  expect(norwegianTravel.types).toEqual({
    coin: 1,
    banknote: 0,
    stamp: 0,
    bullion: 0,
  });

  const searched = await optionsFor({ search: "krona" });
  expect(searched.types).toEqual({
    coin: 1,
    banknote: 0,
    stamp: 0,
    bullion: 1,
  });
  expect(searched.origins).toEqual({ own: 0, foreign: 1 });
});

test("each person browses only their own Collection, and its Albums' counts", async () => {
  const t = newTest();
  const { ada, travel } = await mixedCollection(t);
  const bo = await person(t, "bo@example.com");
  await addAll(bo, [coin("Bo's coin", { country: "NO" })]);

  const seen = await bo.as.query(api.collection.browse, {
    view: { album: travel },
    page: 1,
    pageSize: 15,
  });
  expect(seen).toMatchObject({ items: [], total: 0, collectionSize: 1 });
  expect(seen.options.albums).toEqual([]);
  expect(await titles(bo)).toEqual(["Bo's coin"]);
  expect(await titles(ada, { search: "Bo" })).toEqual([]);
});

test("browsing needs a signed-in person who has finished signing up", async () => {
  const t = newTest();
  const args = { view: {}, page: 1, pageSize: 15 } as const;
  await expect(t.query(api.collection.browse, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  const newcomer = await person(t, "new@example.com", { setUp: false });
  await expect(newcomer.as.query(api.collection.browse, args)).rejects.toThrow(
    "NOT_SET_UP",
  );
});

test("a Collection too large to read at once is browsed as far as it could be read, and says so", async () => {
  // Convex caps what one query may read; this deployment's cap is lowered so
  // a modest Collection runs into it.
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { documentsRead: 700 },
  });
  rateLimiter.register(t);
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let index = 0; index < 1000; index++)
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "coin",
        title: `Coin ${index}`,
        quantity: 1,
      });
  });

  const result = await ada.as.query(api.collection.browse, {
    view: {},
    page: 1,
    pageSize: 15,
  });
  expect(result.complete).toBe(false);
  expect(result.collectionSize).toBeGreaterThan(0);
  expect(result.collectionSize).toBeLessThan(1000);
  expect(result.items).toHaveLength(15);
});

test("a Collection read in full says so", async () => {
  const t = newTest();
  const { ada } = await mixedCollection(t);

  expect(
    await ada.as.query(api.collection.browse, {
      view: {},
      page: 1,
      pageSize: 15,
    }),
  ).toMatchObject({ complete: true, collectionSize: 5, currency: "NOK" });
});
