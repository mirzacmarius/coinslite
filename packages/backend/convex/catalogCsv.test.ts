/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vitest";
import vercelBuildScript from "../scripts/vercel-build-app.sh?raw";
import { api, internal } from "./_generated/api";
import { parseCsv } from "./catalog/csvText";
import { catalogLimits } from "./catalog/fields";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;
type Caller = Test | ReturnType<Test["withIdentity"]>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A signed-in person who has finished signing up; `admin` gives them the admin role. */
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

const firstPage = { numItems: 100, cursor: null };

/** The bundled datasets take seconds to load on a slow CI runner. */
const slowRunner = 30_000;

test("only admins can preview, import or export the Catalog", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const csv = "id,title\nus,United States\n";

  await expect(t.query(api.catalog.csv.preview, { csv })).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(t.mutation(api.catalog.csv.importFile, { csv })).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    t.query(api.catalog.csv.exportPage, { paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_SIGNED_IN");

  await expect(ada.as.query(api.catalog.csv.preview, { csv })).rejects.toThrow(
    "NOT_ADMIN",
  );
  await expect(
    ada.as.mutation(api.catalog.csv.importFile, { csv }),
  ).rejects.toThrow("NOT_ADMIN");
  await expect(
    ada.as.query(api.catalog.csv.exportPage, { paginationOpts: firstPage }),
  ).rejects.toThrow("NOT_ADMIN");
});

/** Every page of the Catalog export, joined into one file. */
async function exportAll(as: Caller) {
  let csv = "";
  let cursor: string | null = null;
  for (;;) {
    const page: { csv: string; isDone: boolean; continueCursor: string } =
      await as.query(api.catalog.csv.exportPage, {
        paginationOpts: { numItems: 2, cursor },
      });
    csv += page.csv;
    if (page.isDone) return csv;
    cursor = page.continueCursor;
  }
}

/** The export's records as objects keyed by column name. */
function records(csv: string) {
  const parsed = parseCsv(csv);
  if (!("records" in parsed)) throw new Error("The export isn't valid CSV");
  const [columns, ...rows] = parsed.records;
  return rows.map((cells) =>
    Object.fromEntries(columns.map((column, i) => [column, cells[i]])),
  );
}

const morganFile = [
  "id,parent_id,item_type,title,country,denomination,series,material,strike,metal,weight_g,fineness,diameter_mm,year_from,year_to,sort_order,is_addable,facts_source,facts_author,facts_licence,facts_link",
  "us,,,United States,US,,,,,,,,,,,1,,,,,",
  "us-morgan-1881-s,us,coin,Morgan dollar 1881-S,US,1 dollar,Morgan dollar,silver,circulation,silver,26.73,0.9,38.1,1881,1881,5,true,United States Mint,United States Mint,Public domain,https://www.usmint.gov/",
].join("\n");

test("an admin sees what an import will insert, then imports it with parents resolved within the file", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });

  expect(
    await admin.as.query(api.catalog.csv.preview, { csv: morganFile }),
  ).toEqual({
    inserts: 2,
    updates: 0,
    unchanged: 0,
    errorCount: 0,
    errors: [],
  });

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: morganFile }),
  ).toEqual({
    applied: true,
    inserts: 2,
    updates: 0,
    unchanged: 0,
    errorCount: 0,
    errors: [],
  });

  const exported = records(await exportAll(admin.as));
  expect(exported).toEqual([
    expect.objectContaining({
      id: "us",
      parent_id: "",
      title: "United States",
      country: "US",
      sort_order: "1",
      is_addable: "false",
    }),
    expect.objectContaining({
      id: "us-morgan-1881-s",
      parent_id: "us",
      item_type: "coin",
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
      sort_order: "5",
      is_addable: "true",
      facts_source: "United States Mint",
      facts_author: "United States Mint",
      facts_licence: "Public domain",
      facts_link: "https://www.usmint.gov/",
    }),
  ]);
});

test("an import updates the nodes whose ids it names: empty cells clear, missing columns keep", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, { csv: morganFile });

  const edit = [
    "id,title,denomination,year_to",
    "us,United States,,",
    "us-morgan-1881-s,Morgan dollar 1881-S (San Francisco),,1881",
  ].join("\r\n");

  expect(
    await admin.as.query(api.catalog.csv.preview, { csv: edit }),
  ).toMatchObject({ inserts: 0, updates: 1, unchanged: 1, errorCount: 0 });
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: edit }),
  ).toMatchObject({ applied: true, inserts: 0, updates: 1, unchanged: 1 });

  const [, entry] = records(await exportAll(admin.as));
  expect(entry).toMatchObject({
    id: "us-morgan-1881-s",
    parent_id: "us",
    is_addable: "true",
    title: "Morgan dollar 1881-S (San Francisco)",
    denomination: "",
    series: "Morgan dollar",
    year_to: "1881",
    facts_source: "United States Mint",
  });
});

test("importing a file the Catalog already matches changes nothing", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, { csv: morganFile });
  const exported = await exportAll(admin.as);

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: exported }),
  ).toMatchObject({ applied: true, inserts: 0, updates: 0, unchanged: 2 });
  expect(await exportAll(admin.as)).toBe(exported);
});

test("rows without a title or id are rejected by row number, and nothing is imported", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = [
    "id,parent_id,item_type,title,is_addable",
    "us,,,United States,",
    "us-morgan-1878,us,coin,,true",
    ",us,coin,Peace dollar 1921,true",
    "",
    'us-peace-1922,us,coin,"  ",true',
  ].join("\n");

  const expected = {
    inserts: 1,
    updates: 0,
    unchanged: 0,
    errorCount: 3,
    errors: [
      { row: 3, column: "title", code: "TITLE_REQUIRED" },
      { row: 4, column: "id", code: "ID_REQUIRED" },
      { row: 6, column: "title", code: "TITLE_REQUIRED" },
    ],
  };
  expect(await admin.as.query(api.catalog.csv.preview, { csv: file })).toEqual(
    expected,
  );
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: file }),
  ).toEqual({ ...expected, applied: false });
  expect(records(await exportAll(admin.as))).toEqual([]);
});

test("parent_id may name a node already in the Catalog, and a child may come before its parent", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, { csv: morganFile });

  const peace = [
    "id,parent_id,item_type,title,series,is_addable,facts_source,facts_author,facts_licence,facts_link",
    "us-peace-1922,us-peace,coin,Peace dollar 1922,Peace dollar,true,United States Mint,United States Mint,Public domain,https://www.usmint.gov/",
    "us-peace,us,coin,Peace dollar,,false,,,,",
  ].join("\n");
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: peace }),
  ).toMatchObject({ applied: true, inserts: 2, errorCount: 0 });

  const exported = records(await exportAll(admin.as));
  expect(
    exported.map(({ id, parent_id, is_addable }) => [
      id,
      parent_id,
      is_addable,
    ]),
  ).toEqual([
    ["us", "", "false"],
    ["us-morgan-1881-s", "us", "true"],
    ["us-peace", "us", "false"],
    ["us-peace-1922", "us-peace", "true"],
  ]);
});

test("parents that don't exist, are entries or loop back are reported, as are roots marked addable", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, { csv: morganFile });

  const file = [
    "id,parent_id,item_type,title,is_addable",
    "a,nowhere,coin,A,true",
    "b,us-morgan-1881-s,coin,B,true",
    "c,d,,C,false",
    "d,c,,D,false",
    "e,e,,E,false",
    "f,,coin,F,true",
  ].join("\n");

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: file }),
  ).toMatchObject({
    applied: false,
    errors: [
      { row: 2, column: "parent_id", code: "PARENT_NOT_FOUND" },
      { row: 3, column: "parent_id", code: "PARENT_IS_ENTRY" },
      { row: 4, column: "parent_id", code: "PARENT_CYCLE" },
      { row: 5, column: "parent_id", code: "PARENT_CYCLE" },
      { row: 6, column: "parent_id", code: "PARENT_CYCLE" },
      { row: 7, column: "is_addable", code: "ROOT_NOT_ADDABLE" },
    ],
  });
});

test("a grouping moved to another parent takes everything below it along", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, {
    csv: [
      "id,parent_id,item_type,title,is_addable",
      "us,,,United States,false",
      "us-morgan,us,coin,Morgan dollar,false",
      "us-morgan-1881-s,us-morgan,coin,Morgan dollar 1881-S,true",
    ].join("\n"),
  });

  // Silver dollars has no country, so it's a Theme.
  const move = [
    "id,parent_id,title",
    "us-morgan,silver-dollars,Morgan dollar",
    "silver-dollars,,Silver dollars",
  ].join("\n");
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: move }),
  ).toMatchObject({ applied: true, inserts: 1, updates: 1 });

  // Exports list each node after its parent, with everything below it.
  expect(
    records(await exportAll(admin.as)).map(({ id, parent_id }) => [
      id,
      parent_id,
    ]),
  ).toEqual([
    ["silver-dollars", ""],
    ["us-morgan", "silver-dollars"],
    ["us-morgan-1881-s", "us-morgan"],
    ["us", ""],
  ]);
});

test("a grouping becomes an entry only once nothing is below it", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await admin.as.mutation(api.catalog.csv.importFile, {
    csv: [
      "id,parent_id,item_type,title,is_addable",
      "us,,,United States,false",
      "us-morgan,us,coin,Morgan dollar,false",
      "us-morgan-1881-s,us-morgan,coin,Morgan dollar 1881-S,true",
    ].join("\n"),
  });

  const makeEntry = "id,title,is_addable\nus-morgan,Morgan dollar,true";
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: makeEntry }),
  ).toMatchObject({
    applied: false,
    errors: [{ row: 2, column: "is_addable", code: "ENTRY_HAS_CHILDREN" }],
  });

  const moveChildAway = [
    "id,parent_id,title,is_addable",
    "us-morgan,us,Morgan dollar,true",
    "us-morgan-1881-s,us,Morgan dollar 1881-S,true",
  ].join("\n");
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: moveChildAway }),
  ).toMatchObject({ applied: true, updates: 2 });
});

/** A CSV file from rows of cells by column; the header has every column used. */
function csvOf(rows: Array<Record<string, string>>) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))]
    .map((cells) => cells.join(","))
    .join("\n");
}

const us = { id: "us", title: "United States", country: "US" };
const entry = (id: string, cells: Record<string, string> = {}) => ({
  id,
  parent_id: "us",
  item_type: "coin",
  title: id.toUpperCase(),
  is_addable: "true",
  ...cells,
});

/** A group's author, licence and link: the credit besides its source. */
const creditBesidesSource = (group: "facts" | "notes") => ({
  [`${group}_author`]: "A. Writer",
  [`${group}_licence`]: "Public domain",
  [`${group}_link`]: "https://example.org/source",
});

test("every group of facts, notes and images names its source, and none may come from Numista", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = csvOf([
    us,
    entry("a", { weight_g: "26.73", ...creditBesidesSource("facts") }),
    entry("b", {
      technical_details: "Reeded edge",
      ...creditBesidesSource("notes"),
    }),
    entry("c", { image_url: "https://example.org/c.jpg" }),
    entry("d", { facts_author: "A. Writer" }),
    entry("e", {
      weight_g: "26.73",
      facts_source: "Numista",
      ...creditBesidesSource("facts"),
    }),
    entry("f", {
      image_url: "https://en.numista.com/f.jpg",
      image_source: "Someone",
    }),
    entry("g", {
      notes_link: "https://numista.com/catalogue/pieces1.html",
      notes_source: "Our own",
    }),
    entry("h", { numista_id: "1494" }),
    entry("i", {
      weight_g: "26.73",
      facts_source: "United States Mint",
      ...creditBesidesSource("facts"),
      technical_details: "Reeded edge",
      notes_source: "CoinsLite editorial",
      ...creditBesidesSource("notes"),
      image_url: "https://example.org/i.jpg",
      image_source: "Wikimedia Commons",
      image_author: "A. Photographer",
      image_licence: "CC BY-SA 4.0",
      image_link: "https://commons.wikimedia.org/wiki/File:I.jpg",
    }),
  ]);

  expect(
    await admin.as.query(api.catalog.csv.preview, { csv: file }),
  ).toMatchObject({
    inserts: 3,
    errors: [
      { row: 3, column: "facts_source", code: "SOURCE_REQUIRED" },
      { row: 4, column: "notes_source", code: "SOURCE_REQUIRED" },
      { row: 5, column: "image_source", code: "SOURCE_REQUIRED" },
      // An image also needs its author, licence and link.
      { row: 5, column: "image_author", code: "CREDIT_REQUIRED" },
      { row: 5, column: "image_licence", code: "CREDIT_REQUIRED" },
      { row: 5, column: "image_link", code: "CREDIT_REQUIRED" },
      { row: 6, column: "facts_source", code: "SOURCE_REQUIRED" },
      { row: 7, column: "facts_source", code: "NUMISTA_DATA" },
      { row: 8, column: "image_url", code: "NUMISTA_DATA" },
      { row: 9, column: "notes_link", code: "NUMISTA_DATA" },
    ],
  });
});

test("facts and notes are credited in full, as images are: source, author, licence and link", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = csvOf([
    us,
    entry("a", { weight_g: "26.73", facts_source: "United States Mint" }),
    entry("b", {
      technical_details: "Reeded edge",
      notes_source: "CoinsLite editorial",
      notes_author: "CoinsLite",
    }),
    entry("c", {
      weight_g: "26.73",
      facts_source: "United States Mint",
      facts_author: "United States Mint",
      facts_licence: "Public domain",
      facts_link: "https://www.usmint.gov/",
    }),
  ]);

  expect(
    await admin.as.query(api.catalog.csv.preview, { csv: file }),
  ).toMatchObject({
    inserts: 2,
    errors: [
      { row: 3, column: "facts_author", code: "CREDIT_REQUIRED" },
      { row: 3, column: "facts_licence", code: "CREDIT_REQUIRED" },
      { row: 3, column: "facts_link", code: "CREDIT_REQUIRED" },
      { row: 4, column: "notes_licence", code: "CREDIT_REQUIRED" },
      { row: 4, column: "notes_link", code: "CREDIT_REQUIRED" },
    ],
  });
});

test("each cell is checked against what its column holds", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = csvOf([
    { ...us, country: "USA" },
    entry("a", { item_type: "stamp" }),
    entry("b", {
      material: "wood",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("c", {
      strike: "shiny",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("d", {
      metal: "copper",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("e", {
      weight_g: "-1",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("f", {
      fineness: "1.5",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("g", {
      year_from: "1881",
      year_to: "1880",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("h", {
      year_from: "18x1",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("i", { image_url: "ftp://example.org/i.jpg", image_source: "Mint" }),
    entry("j", {
      item_type: "banknote",
      diameter_mm: "38.1",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("k", { item_type: "" }),
    entry("l", { is_addable: "maybe" }),
    entry("Bad id!"),
    entry("b"),
    entry("o", { sort_order: "first" }),
    entry("p", { title: "P".repeat(201) }),
    entry("q", { numista_id: "12.5" }),
    entry("r", {
      material: "Silver",
      strike: "PROOF",
      metal: "silver",
      weight_g: "26.73",
      fineness: "0.900",
      diameter_mm: "38.1",
      year_from: "-44",
      year_to: "1921",
      sort_order: "-2.5",
      facts_source: "Mint",
      ...creditBesidesSource("facts"),
    }),
  ]);

  expect(await admin.as.query(api.catalog.csv.preview, { csv: file })).toEqual({
    inserts: 1,
    updates: 0,
    unchanged: 0,
    errorCount: 18,
    errors: [
      { row: 2, column: "country", code: "INVALID_COUNTRY" },
      { row: 3, column: "item_type", code: "INVALID_VALUE" },
      { row: 4, column: "material", code: "INVALID_VALUE" },
      { row: 5, column: "strike", code: "INVALID_VALUE" },
      { row: 6, column: "metal", code: "INVALID_VALUE" },
      { row: 7, column: "weight_g", code: "INVALID_NUMBER" },
      { row: 8, column: "fineness", code: "INVALID_NUMBER" },
      { row: 9, column: "year_to", code: "YEARS_REVERSED" },
      { row: 10, column: "year_from", code: "INVALID_YEAR" },
      { row: 11, column: "image_url", code: "INVALID_URL" },
      { row: 12, column: "diameter_mm", code: "FIELD_NOT_FOR_TYPE" },
      { row: 13, column: "item_type", code: "ITEM_TYPE_REQUIRED" },
      { row: 14, column: "is_addable", code: "INVALID_VALUE" },
      { row: 15, column: "id", code: "INVALID_ID" },
      { row: 16, column: "id", code: "DUPLICATE_ID" },
      { row: 17, column: "sort_order", code: "INVALID_NUMBER" },
      { row: 18, column: "title", code: "TOO_LONG" },
      { row: 19, column: "numista_id", code: "INVALID_NUMBER" },
    ],
  });
});

test("a file must have an id and a title column, known columns only, and closed quotes", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const problems = async (csv: string) =>
    (await admin.as.query(api.catalog.csv.preview, { csv })).errors;

  expect(await problems("id,name\nus,United States")).toEqual([
    { row: 1, column: "name", code: "UNKNOWN_COLUMN" },
    { row: 1, column: "title", code: "MISSING_COLUMN" },
  ]);
  expect(await problems("id,title,title\nus,A,B")).toEqual([
    { row: 1, column: "title", code: "DUPLICATE_COLUMN" },
  ]);
  expect(await problems("id,title\n\n")).toEqual([
    { row: 1, code: "EMPTY_FILE" },
  ]);
  expect(await problems('id,title\nus,"United States\nus-1,One')).toEqual([
    { row: 2, code: "UNCLOSED_QUOTE" },
  ]);
  const tooMany = [
    "id,title",
    ...Array.from({ length: 3001 }, (_, i) => `n${i},N`),
  ];
  expect(await problems(tooMany.join("\n"))).toEqual([
    { row: 3002, code: "TOO_MANY_ROWS" },
  ]);
});

test("quoted cells may hold commas, quotes and line breaks, and come back the same in exports", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = [
    "﻿id,parent_id,title,historical_notes,notes_source,notes_author,notes_licence,notes_link",
    'us,,"United States, the","Struck ""in"" 1878,\r\nand later.",CoinsLite editorial,CoinsLite,CoinsLite,https://example.org/notes',
  ].join("\r\n");

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: file }),
  ).toMatchObject({ applied: true, inserts: 1 });
  const exported = await exportAll(admin.as);
  expect(exported).toContain('"United States, the"');
  expect(exported).toContain('"Struck ""in"" 1878,\r\nand later."');
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: exported }),
  ).toMatchObject({ applied: true, unchanged: 1 });
});

test("technical facts are columns of their own, read loosely and exported the same way every time", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = csvOf([
    us,
    entry("us-morgan-1878-cc", {
      mint: " Carson City ",
      mint_mark: "CC",
      composition: "Silver 90 %; copper 10",
      edge: "Reeded",
      thickness_mm: "2.4",
      designers: "George T. Morgan",
      mintage: "2212000",
      issue_date: "1878-04",
      withdrawal_date: "",
      facts_source: "United States Mint",
      ...creditBesidesSource("facts"),
    }),
    entry("us-morgan-1878", {
      mint: "Philadelphia",
      mint_mark: "NONE",
      edge: "lettered",
      edge_lettering: "E PLURIBUS UNUM",
      designers: "George T. Morgan;  William Barber ",
      issue_date: "1878-03-11",
      withdrawal_date: "1878",
      facts_source: "United States Mint",
      ...creditBesidesSource("facts"),
    }),
    {
      id: "us-note-1",
      parent_id: "us",
      item_type: "banknote",
      title: "One dollar note",
      is_addable: "true",
      width_mm: "156",
      height_mm: "66.3",
      mintage: "0",
      facts_source: "Bureau of Engraving and Printing",
      ...creditBesidesSource("facts"),
    },
  ]);

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: file }),
  ).toMatchObject({ applied: true, inserts: 4, errorCount: 0 });
  const nodes = records(await exportAll(admin.as));
  expect(nodes.find((node) => node.id === "us-morgan-1878-cc")).toMatchObject({
    mint: "Carson City",
    mint_mark: "CC",
    composition: "silver 90%; copper 10%",
    edge: "reeded",
    edge_lettering: "",
    thickness_mm: "2.4",
    designers: "George T. Morgan",
    mintage: "2212000",
    issue_date: "1878-04",
    withdrawal_date: "",
  });
  expect(nodes.find((node) => node.id === "us-morgan-1878")).toMatchObject({
    mint_mark: "none",
    edge: "lettered",
    edge_lettering: "E PLURIBUS UNUM",
    designers: "George T. Morgan; William Barber",
    issue_date: "1878-03-11",
    withdrawal_date: "1878",
  });
  expect(nodes.find((node) => node.id === "us-note-1")).toMatchObject({
    width_mm: "156",
    height_mm: "66.3",
    mintage: "0",
  });
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, {
      csv: await exportAll(admin.as),
    }),
  ).toMatchObject({ applied: true, updates: 0, unchanged: 4 });
});

test("technical facts are checked against what their columns hold, and coins' own facts stay off banknotes", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const credited = {
    facts_source: "Mint",
    ...creditBesidesSource("facts"),
  };
  const file = csvOf([
    us,
    entry("a", { composition: "silver", ...credited }),
    entry("b", { composition: "unobtainium 50%", ...credited }),
    entry("c", { composition: "silver 90%; copper 20%", ...credited }),
    entry("d", { composition: "silver 90%; silver 10%", ...credited }),
    entry("e", { edge: "wavy", ...credited }),
    entry("f", { mintage: "1.5", ...credited }),
    entry("g", { issue_date: "1878-13", ...credited }),
    entry("h", { withdrawal_date: "11 March 1878", ...credited }),
    entry("i", {
      issue_date: "1904",
      withdrawal_date: "1903-12-31",
      ...credited,
    }),
    entry("j", { thickness_mm: "0", ...credited }),
    entry("k", { designers: "A;;B", ...credited }),
    entry("l", { item_type: "banknote", mint_mark: "S", ...credited }),
    entry("m", { item_type: "banknote", edge: "plain", ...credited }),
    entry("n", { mint: "Philadelphia", ...creditBesidesSource("facts") }),
    entry("o", { issue_date: "1878-02-30", ...credited }),
  ]);

  expect(
    (await admin.as.query(api.catalog.csv.preview, { csv: file })).errors,
  ).toEqual([
    { row: 3, column: "composition", code: "INVALID_VALUE" },
    { row: 4, column: "composition", code: "INVALID_VALUE" },
    { row: 5, column: "composition", code: "INVALID_VALUE" },
    { row: 6, column: "composition", code: "INVALID_VALUE" },
    { row: 7, column: "edge", code: "INVALID_VALUE" },
    { row: 8, column: "mintage", code: "INVALID_NUMBER" },
    { row: 9, column: "issue_date", code: "INVALID_DATE" },
    { row: 10, column: "withdrawal_date", code: "INVALID_DATE" },
    { row: 11, column: "withdrawal_date", code: "DATES_REVERSED" },
    { row: 12, column: "thickness_mm", code: "INVALID_NUMBER" },
    { row: 13, column: "designers", code: "INVALID_VALUE" },
    { row: 14, column: "mint_mark", code: "FIELD_NOT_FOR_TYPE" },
    { row: 15, column: "edge", code: "FIELD_NOT_FOR_TYPE" },
    { row: 16, column: "facts_source", code: "SOURCE_REQUIRED" },
    { row: 17, column: "issue_date", code: "INVALID_DATE" },
  ]);
});

/** A translation's credit in one language, besides its source. */
const translationCredit = (language: string) => ({
  [`notes_author_${language}`]: "CoinsLite",
  [`notes_licence_${language}`]: "CoinsLite",
  [`notes_link_${language}`]: "https://example.org/notes",
});

test("notes come in the language of their source and in translations, each with its own credit", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const file = csvOf([
    {
      ...us,
      notes_language: "EN",
      historical_notes: "The dollar of 1792.",
      notes_source: "CoinsLite editorial",
      ...creditBesidesSource("notes"),
      historical_notes_de: "Der Dollar von 1792.",
      notes_source_de: "CoinsLite editorial translation",
      ...translationCredit("de"),
      technical_details_nb: "Preget i sølv.",
      historical_notes_nb: "Dollaren fra 1792.",
      notes_source_nb: "CoinsLite editorial translation",
      ...translationCredit("nb"),
    },
  ]);

  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: file }),
  ).toMatchObject({ applied: true, inserts: 1, errorCount: 0 });
  const [root] = records(await exportAll(admin.as));
  expect(root).toMatchObject({
    notes_language: "en",
    historical_notes: "The dollar of 1792.",
    historical_notes_de: "Der Dollar von 1792.",
    technical_details_de: "",
    notes_source_de: "CoinsLite editorial translation",
    notes_author_de: "CoinsLite",
    notes_licence_de: "CoinsLite",
    notes_link_de: "https://example.org/notes",
    technical_details_nb: "Preget i sølv.",
    historical_notes_nb: "Dollaren fra 1792.",
    historical_notes_fr: "",
    notes_source_fr: "",
  });
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, {
      csv: await exportAll(admin.as),
    }),
  ).toMatchObject({ applied: true, unchanged: 1 });

  // A file without the translation columns keeps the translations.
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, {
      csv: "id,title,historical_notes\nus,United States,The dollar of 1792.",
    }),
  ).toMatchObject({ applied: true, unchanged: 1 });
});

test("each translation is credited in full, can't come from Numista, and isn't in the notes' own language", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const source = {
    historical_notes: "The dollar.",
    notes_source: "CoinsLite editorial",
    ...creditBesidesSource("notes"),
  };
  const file = csvOf([
    us,
    entry("a", { ...source, historical_notes_fr: "Le dollar." }),
    entry("b", {
      ...source,
      historical_notes_fr: "Le dollar.",
      notes_source_fr: "CoinsLite editorial translation",
    }),
    entry("c", {
      ...source,
      technical_details_ro: "Argint.",
      notes_source_ro: "CoinsLite editorial translation",
      ...translationCredit("ro"),
      notes_link_ro: "https://en.numista.com/catalogue/pieces1.html",
    }),
    entry("d", {
      ...source,
      historical_notes_en: "The dollar again.",
      notes_source_en: "CoinsLite editorial",
      ...translationCredit("en"),
    }),
    entry("e", {
      ...source,
      notes_language: "nb",
      historical_notes_nb: "Dollaren.",
      notes_source_nb: "CoinsLite editorial",
      ...translationCredit("nb"),
    }),
    entry("f", { ...source, notes_language: "English" }),
    entry("g", {
      ...source,
      notes_language: "de",
      historical_notes_en: "The dollar in English.",
      notes_source_en: "CoinsLite editorial translation",
      ...translationCredit("en"),
    }),
  ]);

  expect(
    (await admin.as.query(api.catalog.csv.preview, { csv: file })).errors,
  ).toEqual([
    { row: 3, column: "notes_source_fr", code: "SOURCE_REQUIRED" },
    { row: 3, column: "notes_author_fr", code: "CREDIT_REQUIRED" },
    { row: 3, column: "notes_licence_fr", code: "CREDIT_REQUIRED" },
    { row: 3, column: "notes_link_fr", code: "CREDIT_REQUIRED" },
    { row: 4, column: "notes_author_fr", code: "CREDIT_REQUIRED" },
    { row: 4, column: "notes_licence_fr", code: "CREDIT_REQUIRED" },
    { row: 4, column: "notes_link_fr", code: "CREDIT_REQUIRED" },
    { row: 5, column: "notes_link_ro", code: "NUMISTA_DATA" },
    // English is the notes' language unless the file says otherwise.
    { row: 6, column: "historical_notes_en", code: "SAME_LANGUAGE" },
    { row: 7, column: "historical_notes_nb", code: "SAME_LANGUAGE" },
    { row: 8, column: "notes_language", code: "INVALID_VALUE" },
  ]);
});

test(
  "the bundled US Morgan and Peace dollars load once, with their sources, and loading again changes nothing",
  async () => {
    const t = newTest();
    const admin = await person(t, "admin@example.com", { admin: true });

    // 1 country, 2 series, 96 Morgan and 24 Peace dollar dates and mints.
    expect(await t.action(internal.catalog.seed.load, {})).toContainEqual({
      dataset: "usSilverDollars",
      inserts: 123,
      updates: 0,
      unchanged: 0,
    });
    expect(await t.action(internal.catalog.seed.load, {})).toContainEqual({
      dataset: "usSilverDollars",
      inserts: 0,
      updates: 0,
      unchanged: 123,
    });

    const nodes = records(await exportAll(admin.as));
    const entries = nodes.filter(
      (node) => node.is_addable === "true" && node.country === "US",
    );
    expect(entries).toHaveLength(120);
    expect(
      nodes.find((node) => node.id === "us-morgan-dollar-1893-cc"),
    ).toMatchObject({
      parent_id: "us-morgan-dollar",
      item_type: "coin",
      title: "Morgan dollar 1893-CC",
      country: "US",
      denomination: "1 dollar",
      series: "Morgan dollar",
      material: "silver",
      strike: "circulation",
      metal: "silver",
      weight_g: "26.73",
      fineness: "0.9",
      diameter_mm: "38.1",
      year_from: "1893",
      year_to: "1893",
      facts_source: "United States Mint",
    });
    expect(
      nodes.find((node) => node.id === "us-morgan-dollar-1895"),
    ).toMatchObject({
      strike: "proof",
    });
    expect(
      nodes
        .filter((node) => node.parent_id === "us-peace-dollar")
        .map((node) => node.title),
    ).toContain("Peace dollar 1934-D");
    for (const node of entries) {
      expect(node.facts_source).toBe("United States Mint");
      expect(node.image_url).toBe("");
    }
  },
  slowRunner,
);

test(
  "the US silver dollars' technical facts are structured, and their notes come translated by CoinsLite",
  async () => {
    const t = newTest();
    const admin = await person(t, "admin@example.com", { admin: true });
    await t.action(internal.catalog.seed.load, {});
    const nodes = records(await exportAll(admin.as));
    const node = (id: string) => nodes.find((each) => each.id === id);

    const coinFacts = {
      composition: "silver 90%; copper 10%",
      edge: "reeded",
      designers: "George T. Morgan",
    };
    expect(node("us-morgan-dollar-1893-cc")).toMatchObject({
      ...coinFacts,
      mint: "Carson City",
      mint_mark: "CC",
      technical_details: "",
    });
    expect(node("us-morgan-dollar-1893")).toMatchObject({
      mint: "Philadelphia",
      mint_mark: "none",
    });
    expect(node("us-peace-dollar-1934-d")).toMatchObject({
      designers: "Anthony de Francisci",
      mint: "Denver",
      mint_mark: "D",
    });
    // Only what isn't a fact stays as words, in English and in every other language.
    for (const id of ["us-morgan-dollar-1895", "us-peace-dollar-1921"]) {
      const entry = node(id) ?? {};
      expect(entry.technical_details).not.toBe("");
      for (const language of ["nb", "de", "fr", "ro"]) {
        expect(entry[`technical_details_${language}`]).not.toBe("");
        expect(entry[`notes_source_${language}`]).toBe(
          "CoinsLite editorial translation",
        );
        expect(entry[`notes_author_${language}`]).toBe("CoinsLite");
      }
    }
    for (const id of ["us-morgan-dollar", "us-peace-dollar"]) {
      const series = node(id) ?? {};
      expect(series.technical_details).toBe("");
      for (const language of ["nb", "de", "fr", "ro"])
        expect(series[`historical_notes_${language}`]).not.toBe("");
    }
    expect(node("us-peace-dollar-1921")?.technical_details_de).toBe(
      "In Hochrelief geprägt, ab 1922 flacher.",
    );
  },
  slowRunner,
);

test(
  "loading the bundled datasets again brings Catalog data stored in the earlier shape to the current one",
  async () => {
    const t = newTest();
    await t.action(internal.catalog.seed.load, {});
    // As production stored it before facts had fields of their own.
    await t.run(async (ctx) => {
      const node = await ctx.db
        .query("catalogNodes")
        .withIndex("by_key", (q) => q.eq("key", "us-morgan-dollar-1893-cc"))
        .unique();
      if (!node) throw new Error("No Morgan dollar 1893-CC");
      const {
        _id,
        _creationTime,
        mint,
        mintMark,
        composition,
        edge,
        designers,
        ...earlier
      } = node;
      await ctx.db.replace("catalogNodes", _id, {
        ...earlier,
        technicalDetails: "Mint: Carson City.",
      });
    });

    expect(await t.action(internal.catalog.seed.load, {})).toContainEqual({
      dataset: "usSilverDollars",
      inserts: 0,
      updates: 1,
      unchanged: 122,
    });
    const node = await t.run((ctx) =>
      ctx.db
        .query("catalogNodes")
        .withIndex("by_key", (q) => q.eq("key", "us-morgan-dollar-1893-cc"))
        .unique(),
    );
    expect(node).toMatchObject({ mint: "Carson City", mintMark: "CC" });
    expect(node?.technicalDetails).toBeUndefined();
  },
  slowRunner,
);

test(
  "every preview build loads the bundled Catalog through the function it names, bringing search words up to date",
  async () => {
    // The build runs `convex run <function>` on the branch's preview deployment:
    // by name, with no args.
    const seedCommand = vercelBuildScript
      .replace(/\\\n\s*/g, " ")
      .split("\n")
      .find((line) => /^\s*npx convex run\b/.test(line));
    expect(seedCommand).toContain('--preview-name "$VERCEL_GIT_COMMIT_REF"');
    const functionName = seedCommand?.trim().split(/\s+/).pop();
    expect(functionName).toBe("catalog/seed:load");

    const t = newTest();
    const seed = makeFunctionReference<"action">(functionName ?? "");
    expect(await t.action(seed, {})).toEqual([
      { dataset: "usSilverDollars", inserts: 123, updates: 0, unchanged: 0 },
      { dataset: "euroCommemoratives", inserts: 609, updates: 0, unchanged: 0 },
      { dataset: "norway", inserts: 246, updates: 0, unchanged: 0 },
    ]);

    // A preview seeded before its search words changed finds nothing by them...
    await t.run(async (ctx) => {
      for (const node of await ctx.db.query("catalogNodes").take(200)) {
        await ctx.db.patch(node._id, { searchText: "stale" });
      }
    });
    const ada = await person(t, "ada@example.com");
    const search = () =>
      ada.as.query(api.catalog.search.find, { text: "Vereinigte Staaten" });
    expect((await search()).groups).toEqual([]);

    // ...until its next build loads the Catalog again.
    expect(await t.action(seed, {})).toEqual([
      { dataset: "usSilverDollars", inserts: 0, updates: 0, unchanged: 123 },
      { dataset: "euroCommemoratives", inserts: 0, updates: 0, unchanged: 609 },
      { dataset: "norway", inserts: 0, updates: 0, unchanged: 246 },
    ]);
    expect((await search()).groups).not.toEqual([]);
  },
  slowRunner,
);

test("moving a grouping with more nodes below it than one import may move is refused", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const below = catalogLimits.moveNodes;
  const file = (parent: string) =>
    [
      "id,parent_id,title",
      "us,,United States",
      "silver,,Silver dollars",
      `big,${parent},Big grouping`,
      ...Array.from({ length: below }, (_, n) => `n${n},big,Node ${n}`),
    ].join("\n");
  await admin.as.mutation(api.catalog.csv.importFile, { csv: file("us") });

  // Exactly as many as one import may move: the move goes ahead.
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, {
      csv: "id,parent_id,title\nbig,silver,Big grouping",
    }),
  ).toMatchObject({ applied: true, updates: 1 });

  await admin.as.mutation(api.catalog.csv.importFile, {
    csv: "id,parent_id,title\nn-extra,big,One more",
  });
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, {
      csv: "id,parent_id,title\nbig,us,Big grouping",
    }),
  ).toMatchObject({
    applied: false,
    errors: [{ row: 2, column: "parent_id", code: "TOO_MANY_NODES_BELOW" }],
  });
}, 60_000);
