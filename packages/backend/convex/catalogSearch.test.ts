/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

async function person(t: Test, email: string, extra: { admin?: boolean } = {}) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
      ...(extra.admin && { role: "admin" as const }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

const columns = [
  "id",
  "parent_id",
  "item_type",
  "title",
  "country",
  "denomination",
  "series",
  "year_from",
  "year_to",
  "sort_order",
  "is_addable",
  "facts_source",
  "facts_author",
  "facts_licence",
  "facts_link",
] as const;
type Row = Partial<Record<(typeof columns)[number], string>>;

const testCredit = {
  facts_source: "Test source",
  facts_author: "Test author",
  facts_licence: "Test licence",
  facts_link: "https://example.org/source",
};

/** A Catalog CSV file of these rows; facts are credited to a test source. */
const catalogFile = (rows: Row[]) =>
  [
    columns.join(","),
    ...rows.map((row) =>
      columns
        .map((column) =>
          column.startsWith("facts_") && (row.denomination || row.series)
            ? testCredit[column as keyof typeof testCredit]
            : row[column] ?? "",
        )
        .join(","),
    ),
  ].join("\n");

/**
 * A small Catalog: United States silver dollars, Norwegian coins and a
 * banknote, and a Theme of 2-euro commemoratives.
 */
const sampleCatalog = catalogFile([
  { id: "us", title: "United States", country: "US" },
  {
    id: "us-morgan",
    parent_id: "us",
    title: "Morgan dollar",
    item_type: "coin",
    country: "US",
    series: "Morgan dollar",
    denomination: "1 dollar",
  },
  {
    id: "us-morgan-1881",
    parent_id: "us-morgan",
    item_type: "coin",
    title: "Morgan dollar 1881",
    country: "US",
    denomination: "1 dollar",
    series: "Morgan dollar",
    year_from: "1881",
    year_to: "1881",
    is_addable: "true",
  },
  {
    id: "us-morgan-1878",
    parent_id: "us-morgan",
    item_type: "coin",
    title: "Morgan dollar 1878",
    country: "US",
    denomination: "1 dollar",
    series: "Morgan dollar",
    year_from: "1878",
    year_to: "1878",
    is_addable: "true",
  },
  {
    id: "us-peace-1922",
    parent_id: "us",
    item_type: "coin",
    title: "Peace dollar 1922",
    country: "US",
    denomination: "1 dollar",
    series: "Peace dollar",
    year_from: "1922",
    year_to: "1922",
    is_addable: "true",
  },
  { id: "no", title: "Norway", country: "NO" },
  {
    id: "no-krone-1974",
    parent_id: "no",
    item_type: "coin",
    title: "Olav V 1974",
    country: "NO",
    denomination: "1 krone",
    year_from: "1974",
    year_to: "1974",
    is_addable: "true",
  },
  {
    id: "no-100-kroner-1999",
    parent_id: "no",
    item_type: "banknote",
    title: "100 kroner 1999",
    country: "NO",
    denomination: "100 kroner",
    year_from: "1999",
    year_to: "1999",
    is_addable: "true",
  },
  { id: "euro-2", title: "2-euro commemoratives" },
  {
    id: "euro-2-de-2006",
    parent_id: "euro-2",
    item_type: "coin",
    title: "2 euro Schleswig-Holstein 2006",
    country: "DE",
    denomination: "2 euro",
    series: "German states",
    year_from: "2006",
    year_to: "2006",
    is_addable: "true",
  },
]);

/** Someone signed in, with the sample Catalog loaded by an admin. */
async function withSampleCatalog() {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const report = await admin.as.mutation(api.catalog.csv.importFile, {
    csv: sampleCatalog,
  });
  expect(report.applied).toBe(true);
  const ada = await person(t, "ada@example.com");
  return { t, admin, ada };
}

test("only signed-in people can search the Catalog", async () => {
  const { t } = await withSampleCatalog();
  await expect(
    t.query(api.catalog.search.find, { text: "morgan" }),
  ).rejects.toThrow("NOT_SIGNED_IN");
});

test("search starts at 2 characters", async () => {
  const { ada } = await withSampleCatalog();
  for (const text of ["", " ", "m", " m ", "1-"]) {
    expect(await ada.as.query(api.catalog.search.find, { text })).toEqual({
      groups: [],
      capped: false,
    });
  }
});

type Caller = Awaited<ReturnType<typeof person>>["as"];
type SearchArgs = FunctionArgs<typeof api.catalog.search.find>;

/** The keys of the nodes a search finds, in no particular order. */
async function keysFound(as: Caller, args: SearchArgs) {
  const { groups } = await as.query(api.catalog.search.find, args);
  return groups.flatMap((group) => group.nodes.map((node) => node.key)).sort();
}

test("a word finds the nodes with a word starting with it in their title", async () => {
  const { ada } = await withSampleCatalog();
  const morgan = ["us-morgan", "us-morgan-1878", "us-morgan-1881"];
  expect(await keysFound(ada.as, { text: "morgan" })).toEqual(morgan);
  expect(await keysFound(ada.as, { text: "Morg" })).toEqual(morgan);
  expect(await keysFound(ada.as, { text: "1881" })).toEqual(["us-morgan-1881"]);
  expect(await keysFound(ada.as, { text: "holstein" })).toEqual([
    "euro-2-de-2006",
  ]);
  expect(await keysFound(ada.as, { text: "organ" })).toEqual([]);
});

test("a word also finds nodes by denomination, series or country", async () => {
  const { ada } = await withSampleCatalog();
  expect(await keysFound(ada.as, { text: "krone" })).toEqual([
    "no-100-kroner-1999",
    "no-krone-1974",
  ]);
  expect(await keysFound(ada.as, { text: "german states" })).toEqual([
    "euro-2-de-2006",
  ]);
  const unitedStates = [
    "us",
    "us-morgan",
    "us-morgan-1878",
    "us-morgan-1881",
    "us-peace-1922",
  ];
  expect(await keysFound(ada.as, { text: "US" })).toEqual(unitedStates);
});

test("countries are found by their name in any of the app's languages", async () => {
  const { ada } = await withSampleCatalog();
  const unitedStates = [
    "us",
    "us-morgan",
    "us-morgan-1878",
    "us-morgan-1881",
    "us-peace-1922",
  ];
  const norway = ["no", "no-100-kroner-1999", "no-krone-1974"];
  expect(await keysFound(ada.as, { text: "united states" })).toEqual(
    unitedStates,
  );
  expect(await keysFound(ada.as, { text: "Vereinigte Staaten" })).toEqual(
    unitedStates,
  );
  expect(await keysFound(ada.as, { text: "États-Unis" })).toEqual(unitedStates);
  expect(await keysFound(ada.as, { text: "etats unis" })).toEqual(unitedStates);
  expect(await keysFound(ada.as, { text: "Norge" })).toEqual(norway);
  expect(await keysFound(ada.as, { text: "Norvegia" })).toEqual(norway);
  expect(await keysFound(ada.as, { text: "Deutschland" })).toEqual([
    "euro-2-de-2006",
  ]);
});

test("several words must all match, in any order", async () => {
  const { ada } = await withSampleCatalog();
  for (const text of ["morgan 1881", "1881 morgan", "1881 MORGAN dollar"]) {
    expect(await keysFound(ada.as, { text }), text).toEqual(["us-morgan-1881"]);
  }
  expect(await keysFound(ada.as, { text: "1922 dollar peace" })).toEqual([
    "us-peace-1922",
  ]);
  expect(await keysFound(ada.as, { text: "1999 norge" })).toEqual([
    "no-100-kroner-1999",
  ]);
  expect(await keysFound(ada.as, { text: "morgan 1922" })).toEqual([]);
});

test("a search can be limited to one Item type", async () => {
  const { ada } = await withSampleCatalog();
  expect(
    await keysFound(ada.as, { text: "norge", itemType: "banknote" }),
  ).toEqual(["no-100-kroner-1999"]);
  expect(await keysFound(ada.as, { text: "norge", itemType: "coin" })).toEqual([
    "no-krone-1974",
  ]);
  expect(
    await keysFound(ada.as, { text: "morgan", itemType: "banknote" }),
  ).toEqual([]);
});

test("the Catalog picker finds only Catalog entries", async () => {
  const { ada } = await withSampleCatalog();
  expect(
    await keysFound(ada.as, { text: "morgan", entriesOnly: true }),
  ).toEqual(["us-morgan-1878", "us-morgan-1881"]);
  expect(
    await keysFound(ada.as, {
      text: "united states",
      itemType: "coin",
      entriesOnly: true,
    }),
  ).toEqual(["us-morgan-1878", "us-morgan-1881", "us-peace-1922"]);
});

/** Each group's country and series, with the keys of its nodes in order. */
async function groupsFound(as: Caller, args: SearchArgs) {
  const { groups } = await as.query(api.catalog.search.find, args);
  return groups.map(({ country, series, nodes }) => ({
    country,
    series,
    keys: nodes.map((node) => node.key),
  }));
}

test("results are grouped by country and series, groupings first, then entries by year", async () => {
  const { ada } = await withSampleCatalog();

  const dollars = await groupsFound(ada.as, { text: "dollar" });
  expect(dollars).toHaveLength(2);
  expect(dollars).toEqual(
    expect.arrayContaining([
      {
        country: "US",
        series: "Morgan dollar",
        keys: ["us-morgan", "us-morgan-1878", "us-morgan-1881"],
      },
      { country: "US", series: "Peace dollar", keys: ["us-peace-1922"] },
    ]),
  );

  const twentiethCentury = await groupsFound(ada.as, { text: "19" });
  expect(twentiethCentury).toHaveLength(2);
  expect(twentiethCentury).toEqual(
    expect.arrayContaining([
      { country: "US", series: "Peace dollar", keys: ["us-peace-1922"] },
      { country: "NO", keys: ["no-krone-1974", "no-100-kroner-1999"] },
    ]),
  );

  // A Theme has no country; its entries keep theirs.
  const euros = await groupsFound(ada.as, { text: "2 euro" });
  expect(euros).toHaveLength(2);
  expect(euros).toEqual(
    expect.arrayContaining([
      { keys: ["euro-2"] },
      { country: "DE", series: "German states", keys: ["euro-2-de-2006"] },
    ]),
  );
});

test("a country's groups stay together, whatever order its nodes are found in", async () => {
  const { admin, ada } = await withSampleCatalog();
  // Loaded after Norway, so a search finds it after the Norwegian nodes.
  await admin.as.mutation(api.catalog.csv.importFile, {
    csv: catalogFile([
      {
        id: "us-1-dollar-1999",
        parent_id: "us",
        item_type: "banknote",
        title: "1 dollar 1999",
        country: "US",
        denomination: "1 dollar",
        year_from: "1999",
        year_to: "1999",
        is_addable: "true",
      },
    ]),
  });

  const groups = await groupsFound(ada.as, { text: "19" });
  expect(groups).toHaveLength(3);
  expect(groups).toEqual(
    expect.arrayContaining([
      { country: "US", series: "Peace dollar", keys: ["us-peace-1922"] },
      { country: "US", keys: ["us-1-dollar-1999"] },
      { country: "NO", keys: ["no-krone-1974", "no-100-kroner-1999"] },
    ]),
  );
  const countries = groups.map((group) => group.country);
  expect(countries.indexOf("NO")).not.toBe(1);
});

test("a search shows at most 50 results and says when there are more", async () => {
  const { admin, ada } = await withSampleCatalog();
  const ores = (from: number, to: number) =>
    catalogFile(
      Array.from({ length: to - from + 1 }, (_, i) => {
        const year = String(1874 + from + i);
        return {
          id: `no-1-ore-${year}`,
          parent_id: "no",
          item_type: "coin",
          title: `1 øre ${year}`,
          country: "NO",
          denomination: "1 øre",
          year_from: year,
          year_to: year,
          is_addable: "true",
        };
      }),
    );
  const search = () => ada.as.query(api.catalog.search.find, { text: "1 ore" });
  const count = (result: Awaited<ReturnType<typeof search>>) =>
    result.groups.reduce((sum, group) => sum + group.nodes.length, 0);

  await admin.as.mutation(api.catalog.csv.importFile, { csv: ores(1, 50) });
  const fifty = await search();
  expect(count(fifty)).toBe(50);
  expect(fifty.capped).toBe(false);

  await admin.as.mutation(api.catalog.csv.importFile, { csv: ores(51, 51) });
  const more = await search();
  expect(count(more)).toBe(50);
  expect(more.capped).toBe(true);

  // Words that narrow the search bring the count back under the cap.
  const narrowed = await ada.as.query(api.catalog.search.find, {
    text: "1 øre 1900",
  });
  expect(narrowed.groups.flatMap((g) => g.nodes.map((n) => n.key))).toEqual([
    "no-1-ore-1900",
  ]);
  expect(narrowed.capped).toBe(false);
});

test("the bundled Catalog: a broad search is capped, a narrow one is not", async () => {
  const t = newTest();
  await t.action(internal.catalog.seed.load, {});
  const ada = await person(t, "ada@example.com");

  const morgan = await ada.as.query(api.catalog.search.find, {
    text: "morgan",
    itemType: "coin",
    entriesOnly: true,
  });
  expect(morgan.capped).toBe(true);
  expect(morgan.groups).toHaveLength(1);
  expect(morgan.groups[0]).toMatchObject({
    country: "US",
    series: "Morgan dollar",
  });
  expect(morgan.groups[0]?.nodes).toHaveLength(50);

  const carsonCity1881 = await ada.as.query(api.catalog.search.find, {
    text: "1881-CC morgan",
    entriesOnly: true,
  });
  expect(carsonCity1881).toMatchObject({
    capped: false,
    groups: [{ nodes: [{ key: "us-morgan-dollar-1881-cc" }] }],
  });
});

test("nodes stored before country names were searchable can be reindexed", async () => {
  vi.useFakeTimers();
  const t = newTest();
  await t.run(async (ctx) => {
    for (const [key, title] of [
      ["us", "United States"],
      ["ch", "Switzerland"],
    ]) {
      await ctx.db.insert("catalogNodes", {
        key,
        path: key,
        kind: "country",
        title,
        sortOrder: 0,
        country: key.toUpperCase(),
        // As the Catalog import used to store it.
        searchText: `${title} ${key.toUpperCase()}`,
      });
    }
  });
  const ada = await person(t, "ada@example.com");
  expect(await keysFound(ada.as, { text: "Schweiz" })).toEqual([]);

  await t.mutation(internal.catalog.search.reindex, { batchSize: 1 });
  vi.advanceTimersByTime(1);
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(await keysFound(ada.as, { text: "Schweiz" })).toEqual(["ch"]);
  expect(await keysFound(ada.as, { text: "Vereinigte" })).toEqual(["us"]);
  vi.useRealTimers();
});
