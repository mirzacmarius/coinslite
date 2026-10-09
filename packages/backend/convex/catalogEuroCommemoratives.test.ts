/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { parseCsv } from "./catalog/csvText";
import { euroCommemoratives } from "./catalog/datasets/euroCommemoratives";
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
      homeCurrency: "EUR" as const,
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

/** The 2-euro commemoratives in a freshly seeded Catalog. */
async function seeded() {
  const t = newTest();
  const as = await admin(t);
  await t.mutation(internal.catalog.seed.load, {});
  const nodes = (await exported(as)).filter((node) =>
    node.id?.startsWith("eur2-"),
  );
  const entries = nodes.filter((node) => node.is_addable === "true");
  const entry = (id: string) => entries.find((node) => node.id === id);
  return { nodes, entries, entry };
}

// The ECB's year pages list 584 coins from 2004 to 2025, issued by 24
// countries; with the Theme root that makes 609 Catalog nodes.
const nodeCount = 609;

test("the 2-euro commemoratives go through the Catalog CSV import with no rejected rows", async () => {
  const t = newTest();
  const as = await admin(t);

  expect(
    await as.query(api.catalog.csv.preview, { csv: euroCommemoratives }),
  ).toEqual({
    inserts: nodeCount,
    updates: 0,
    unchanged: 0,
    errorCount: 0,
    errors: [],
  });
  expect(
    await as.mutation(api.catalog.csv.importFile, { csv: euroCommemoratives }),
  ).toMatchObject({ applied: true, inserts: nodeCount, errorCount: 0 });
});

test("loading the bundled Catalog adds the 2-euro commemoratives once; loading again changes nothing", async () => {
  const t = newTest();

  expect(await t.mutation(internal.catalog.seed.load, {})).toContainEqual({
    dataset: "euroCommemoratives",
    inserts: nodeCount,
    updates: 0,
    unchanged: 0,
  });
  expect(await t.mutation(internal.catalog.seed.load, {})).toContainEqual({
    dataset: "euroCommemoratives",
    inserts: 0,
    updates: 0,
    unchanged: nodeCount,
  });
});

test("a Theme root holds the issuing countries by ISO code, each with one entry per commemorative coin from 2004", async () => {
  const { nodes, entries, entry } = await seeded();

  expect(nodes.find((node) => node.id === "eur2-commemoratives")).toMatchObject(
    {
      parent_id: "",
      country: "",
      title: "2-euro commemoratives",
      is_addable: "false",
    },
  );
  const countries = nodes.filter(
    (node) => node.parent_id === "eur2-commemoratives",
  );
  // Every country that has issued a 2-euro commemorative, euro area or not.
  expect(countries.map((node) => node.country).sort()).toEqual([
    "AD",
    "AT",
    "BE",
    "CY",
    "DE",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "IE",
    "IT",
    "LT",
    "LU",
    "LV",
    "MC",
    "MT",
    "NL",
    "PT",
    "SI",
    "SK",
    "SM",
    "VA",
  ]);
  expect(countries.every((node) => node.is_addable === "false")).toBe(true);
  expect(countries.find((node) => node.country === "VA")?.title).toBe(
    "Vatican City",
  );

  expect(entries).toHaveLength(584);
  for (const node of entries) {
    expect(node.parent_id).toBe(`eur2-${node.country?.toLowerCase()}`);
  }
  expect(
    [...new Set(entries.map((node) => Number(node.year_from)))].sort(),
  ).toEqual(Array.from({ length: 22 }, (_, i) => 2004 + i));
  // 2004, the first year: Greece's Olympic Games coin and five more.
  expect(
    entries
      .filter((node) => node.year_from === "2004")
      .map((node) => node.country)
      .sort(),
  ).toEqual(["FI", "GR", "IT", "LU", "SM", "VA"]);
  // A coin issued jointly is one entry for each country that issued it.
  expect(
    entries
      .filter((node) =>
        node.id?.endsWith("-2007-50th-anniversary-of-the-treaty-of-rome"),
      )
      .map((node) => node.country)
      .sort(),
  ).toEqual([
    "AT",
    "BE",
    "DE",
    "ES",
    "FI",
    "FR",
    "GR",
    "IE",
    "IT",
    "LU",
    "NL",
    "PT",
    "SI",
  ]);

  expect(entry("eur2-de-2006-schleswig-holstein")).toMatchObject({
    item_type: "coin",
    country: "DE",
    denomination: "2 euro",
    material: "bimetallic",
    strike: "circulation",
    weight_g: "8.5",
    diameter_mm: "25.75",
    year_from: "2006",
    year_to: "2006",
    technical_details:
      "Issuing volume: 30 million coins. Issuing date: February 2006.",
  });
  expect(entry("eur2-de-2006-schleswig-holstein")?.historical_notes).toMatch(
    /^The Holstentor, the gate symbolising of the town of Lübeck/,
  );
});

test("titles stay in the issuing country's language where the ECB gives them, otherwise in the ECB's English", async () => {
  const { entry } = await seeded();
  const title = (id: string) => entry(id)?.title;

  expect(title("eur2-gr-2004-olympic-games-in-athens-2004")).toBe(
    "Ολυμπιακοί Αγώνες «Αθήνα 2004»",
  );
  expect(title("eur2-de-2006-schleswig-holstein")).toBe(
    "„Bundesländerserie“ – Schleswig-Holstein",
  );
  expect(title("eur2-fr-2007-50th-anniversary-of-the-treaty-of-rome")).toBe(
    "50e anniversaire du traité de Rome",
  );
  expect(title("eur2-sm-2004-bartolomeo-borghesi-historian-numismatist")).toBe(
    "Bartolomeo Borghesi, storico e numismatico",
  );
  // Several official languages, or one the ECB doesn't publish in: English.
  expect(title("eur2-be-2007-50th-anniversary-of-the-treaty-of-rome")).toBe(
    "50th anniversary of the Treaty of Rome",
  );
  expect(title("eur2-ad-2014-20-years-in-the-council-of-europe")).toBe(
    "20 years in the Council of Europe",
  );
});

test("2-euro Catalog entry titles stay concise instead of containing descriptions", async () => {
  const { entries } = await seeded();

  expect(entries.filter((entry) => entry.title.length > 120)).toEqual([]);
  expect(
    entries.find(
      (entry) =>
        entry.id ===
        "eur2-ee-2018-estonia-latvia-and-lithuania-jointly-issued-a",
    )?.title,
  ).toBe("Balti riigid");
});

test("every entry credits where its facts and notes come from, as the reuse terms ask", async () => {
  const { entries, entry } = await seeded();
  const ecbLicence =
    "Reused under the ECB's copyright terms, citing the ECB. Available free of charge at www.ecb.europa.eu. Changes by CoinsLite: arranged into Catalog fields; capitals and typography tidied.";

  expect(entry("eur2-gr-2004-olympic-games-in-athens-2004")).toMatchObject({
    facts_source: "European Central Bank",
    facts_author: "European Central Bank",
    facts_licence: ecbLicence,
    facts_link:
      "https://www.ecb.europa.eu/euro/coins/comm/html/comm_2004.el.html",
    notes_source: "European Central Bank",
    notes_licence: ecbLicence,
    notes_link:
      "https://www.ecb.europa.eu/euro/coins/comm/html/comm_2004.en.html",
  });
  // The ECB's list gives this coin no title; the Official Journal's notice does.
  expect(
    entry("eur2-lu-2023-25th-anniversary-of-the-membership-of-grand-duke"),
  ).toMatchObject({
    title:
      "The 25th anniversary of the membership of Grand Duke Henri to the International Olympic Committee",
    facts_source:
      "Official Journal of the European Union, notice 2023/C 122/05",
    facts_author: "European Commission",
    facts_licence:
      "© European Union. Reuse allowed with the source acknowledged (Commission Decision 2011/833/EU). Changes by CoinsLite: arranged into Catalog fields; capitals and typography tidied.",
    facts_link:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:C:2023:122:FULL",
    notes_source: "European Central Bank",
  });
  for (const node of entries) {
    expect(node.facts_source).not.toBe("");
    expect(node.facts_link).toMatch(/^https:\/\//);
    expect(node.notes_source).toBe("European Central Bank");
    expect(node.notes_link).toBe(
      `https://www.ecb.europa.eu/euro/coins/comm/html/comm_${node.year_from}.en.html`,
    );
  }
});

test("no entry shows an image: the national sides' designs aren't clearly free to show", async () => {
  const { nodes } = await seeded();

  for (const node of nodes) {
    expect(node.image_url).toBe("");
    expect(node.image_source).toBe("");
  }
});

test("collectors browse the Theme to its countries and each country's coins by year, and find a coin by its title", async () => {
  const t = newTest();
  const as = await admin(t);
  await t.mutation(internal.catalog.seed.load, {});

  expect(await as.query(api.catalog.browse.roots, {})).toContainEqual({
    key: "eur2-commemoratives",
    kind: "theme",
    title: "2-euro commemoratives",
    countryNode: false,
    entryCount: 584,
  });
  const theme = await as.query(api.catalog.browse.node, {
    key: "eur2-commemoratives",
  });
  expect(theme).toMatchObject({ kind: "theme", countryNode: false });
  const countries = theme && "groupings" in theme ? theme.groupings : [];
  expect(countries).toHaveLength(24);
  // Most coins first: Finland and Luxembourg have issued 39 each.
  expect(countries.slice(0, 2)).toEqual([
    expect.objectContaining({ key: "eur2-fi", country: "FI", entryCount: 39 }),
    expect.objectContaining({ key: "eur2-lu", country: "LU", entryCount: 39 }),
  ]);
  expect(
    await as.query(api.catalog.browse.node, { key: "eur2-de" }),
  ).toMatchObject({ countryNode: true, entryCount: 33 });

  // Within a country: one denomination, no series, then the coins by year.
  expect(
    await as.query(api.catalog.browse.denominations, { key: "eur2-de" }),
  ).toEqual([{ denomination: "2 euro", seriesCount: 1 }]);
  expect(
    await as.query(api.catalog.browse.series, {
      key: "eur2-de",
      denomination: "2 euro",
    }),
  ).toEqual([{ series: null, firstYear: 2006, lastYear: 2025 }]);
  const { page } = await as.query(api.catalog.browse.seriesEntries, {
    key: "eur2-de",
    denomination: "2 euro",
    series: null,
    paginationOpts: { numItems: 3, cursor: null },
  });
  expect(page.map((row) => [row.yearFrom, row.title])).toEqual([
    [2006, "„Bundesländerserie“ – Schleswig-Holstein"],
    [2007, "„Bundesländerserie“ – Mecklenburg-Vorpommern"],
    [2007, "50. Jahrestag der Unterzeichnung des Vertrags von Rom"],
  ]);

  const found = await as.query(api.catalog.search.find, {
    text: "Schleswig-Holstein",
    entriesOnly: true,
  });
  expect(
    found.groups.flatMap((group) => group.nodes.map((node) => node.key)),
  ).toEqual(["eur2-de-2006-schleswig-holstein"]);
});
