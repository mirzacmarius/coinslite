/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { parseCsv } from "./catalog/csvText";
import { norway } from "./catalog/datasets/norway";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

async function admin(t: Test) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "admin@example.com",
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
      role: "admin" as const,
    }),
  );
  return t.withIdentity({ subject: `${userId}|session` });
}

/** The whole Catalog export, as objects keyed by column name. */
async function exported(as: Awaited<ReturnType<typeof admin>>) {
  let csv = "";
  let cursor: string | null = null;
  for (;;) {
    const page: { csv: string; isDone: boolean; continueCursor: string } =
      await as.query(api.catalog.csv.exportPage, {
        paginationOpts: { numItems: 500, cursor },
      });
    csv += page.csv;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  const parsed = parseCsv(csv);
  if (!("records" in parsed)) throw new Error("The export isn't valid CSV");
  const [columns = [], ...rows] = parsed.records;
  return rows.map(
    (cells) =>
      Object.fromEntries(columns.map((column, i) => [column, cells[i]])) as {
        [column: string]: string;
      },
  );
}

/** Norway in a freshly seeded Catalog. */
async function seeded() {
  const t = newTest();
  const as = await admin(t);
  await t.mutation(internal.catalog.seed.load, {});
  const nodes = (await exported(as)).filter(
    (node) => node.id === "no" || node.id?.startsWith("no-"),
  );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const entries = nodes.filter((node) => node.is_addable === "true");
  return { nodes, entries, byId };
}

// The root, 26 denominations with their 73 series, 100 coins and 46 notes.
const nodeCount = 246;

test("the Norway dataset goes through the Catalog CSV import with no rejected rows", async () => {
  const t = newTest();
  const as = await admin(t);

  expect(await as.query(api.catalog.csv.preview, { csv: norway })).toEqual({
    inserts: nodeCount,
    updates: 0,
    unchanged: 0,
    errorCount: 0,
    errors: [],
  });
  expect(
    await as.mutation(api.catalog.csv.importFile, { csv: norway }),
  ).toMatchObject({ applied: true, inserts: nodeCount, errorCount: 0 });
});

test("loading the bundled Catalog adds Norway once; loading again changes nothing", async () => {
  const t = newTest();

  expect(await t.mutation(internal.catalog.seed.load, {})).toContainEqual({
    dataset: "norway",
    inserts: nodeCount,
    updates: 0,
    unchanged: 0,
  });
  expect(await t.mutation(internal.catalog.seed.load, {})).toContainEqual({
    dataset: "norway",
    inserts: 0,
    updates: 0,
    unchanged: nodeCount,
  });
});

test("Norway is a country root holding denominations, then series, then entries: 100 coins and 46 banknotes", async () => {
  const { nodes, entries, byId } = await seeded();

  expect(byId.get("no")).toMatchObject({
    parent_id: "",
    title: "Norway",
    country: "NO",
    is_addable: "false",
  });
  for (const entry of entries) {
    const series = byId.get(entry.parent_id ?? "");
    const denomination = byId.get(series?.parent_id ?? "");
    expect(series?.is_addable).toBe("false");
    expect(series?.series).toBe(entry.series);
    expect(denomination?.parent_id).toBe("no");
    expect(denomination?.denomination).toBe(entry.denomination);
    expect(entry.country).toBe("NO");
  }
  expect(nodes).toHaveLength(nodeCount);
  expect(nodes.some((node) => node.title === "Commemorative coins")).toBe(true);
  expect(entries.filter((entry) => entry.item_type === "coin")).toHaveLength(
    100,
  );
  expect(
    entries.filter((entry) => entry.item_type === "banknote"),
  ).toHaveLength(46);
});

test("every Norway entry credits Norges Bank for its facts, coins carry their Strike where it's known, and none has an image", async () => {
  const { nodes, entries, byId } = await seeded();

  for (const node of nodes) {
    expect(node.image_url).toBe("");
    expect(node.image_source).toBe("");
  }
  for (const entry of entries) {
    expect(entry).toMatchObject({
      facts_source: "Norges Bank",
      facts_author: "Norges Bank",
      facts_licence: expect.stringContaining("Kilde: Norges Bank"),
      facts_link: expect.stringMatching(/^https:\/\/www\.norges-bank\.no\//),
      notes_source: "CoinsLite editorial, after Norges Bank",
      notes_author: "CoinsLite",
      notes_licence: "CoinsLite",
      notes_link: expect.stringMatching(/^https:\/\/www\.norges-bank\.no\//),
    });
  }

  expect(byId.get("no-1-krone-olav-v-1958-1973")).toMatchObject({
    title: "1 krone 1958–1973",
    material: "cupronickel",
    strike: "circulation",
    weight_g: "7",
    diameter_mm: "25",
    year_from: "1958",
    year_to: "1973",
  });
  expect(byId.get("no-200-kroner-comm-2014-grunnloven-200-ar")).toMatchObject({
    title: "200 kroner 2014 – Grunnloven 200 år",
    strike: "proof",
    metal: "silver",
    fineness: "0.925",
  });
  expect(byId.get("no-note-100-kroner-v-1")).toMatchObject({
    title: "100 kroner 1962–1977, series V",
    item_type: "banknote",
    series: "Series V",
    strike: "",
    weight_g: "",
  });
});
