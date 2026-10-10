/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { type EditorValues, catalogLimits } from "./catalog/fields";
import { collectionCountsOf } from "./collectionCounts";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;

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

test("an admin adds a country root, and the tree lists it", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });

  await admin.as.mutation(api.catalog.editor.create, {
    parentKey: null,
    key: "no",
    addable: false,
    values: { title: "Norway", sortOrder: 0, country: "NO" },
  });

  const roots = await admin.as.query(api.catalog.editor.children, {
    parentKey: null,
    paginationOpts: firstPage,
  });
  expect(roots.page).toEqual([
    expect.objectContaining({ key: "no", kind: "country", title: "Norway" }),
  ]);
});

type Caller = Awaited<ReturnType<typeof person>>["as"];

/** Credit for facts from Norges Bank, in full. */
const norgesBank = {
  factsSource: "Norges Bank",
  factsAuthor: "Norges Bank",
  factsLicence: "Public domain",
  factsLink: "https://www.norges-bank.no/",
};

/** A coin Catalog entry's values, its facts credited to a source. */
const coinValues = (title: string, extra: Partial<EditorValues> = {}) => ({
  title,
  sortOrder: 0,
  itemType: "coin" as const,
  ...norgesBank,
  ...extra,
});

/** Norway › Coins › 1 krone 1999, built in the editor. */
async function norway(admin: Caller) {
  await admin.mutation(api.catalog.editor.create, {
    parentKey: null,
    key: "no",
    addable: false,
    values: { title: "Norway", sortOrder: 0, country: "NO" },
  });
  await admin.mutation(api.catalog.editor.create, {
    parentKey: "no",
    key: "no-coins",
    addable: false,
    values: { title: "Coins", sortOrder: 1 },
  });
  await admin.mutation(api.catalog.editor.create, {
    parentKey: "no-coins",
    key: "no-1-krone-1999",
    addable: true,
    values: coinValues("1 krone 1999", {
      country: "NO",
      denomination: "1 krone",
      yearFrom: 1999,
    }),
  });
}

/** How many Catalog entries the browse view counts below each root. */
async function rootCounts(as: Caller) {
  const roots = await as.query(api.catalog.browse.roots, {});
  return Object.fromEntries(roots.map((root) => [root.key, root.entryCount]));
}

/** The keys of the nodes a Catalog search finds. */
async function found(as: Caller, text: string) {
  const { groups } = await as.query(api.catalog.search.find, { text });
  return groups.flatMap((group) => group.nodes.map((node) => node.key));
}

test("an admin adds groupings and Catalog entries below a root; browsing and search see them at once", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);

  const below = (parentKey: string) =>
    admin.as.query(api.catalog.editor.children, {
      parentKey,
      paginationOpts: firstPage,
    });
  expect((await below("no")).page).toEqual([
    expect.objectContaining({
      key: "no-coins",
      kind: "grouping",
      entryCount: 1,
    }),
  ]);
  expect((await below("no-coins")).page).toEqual([
    expect.objectContaining({
      key: "no-1-krone-1999",
      kind: "entry",
      itemType: "coin",
      yearFrom: 1999,
    }),
  ]);

  expect(await rootCounts(ada.as)).toEqual({ no: 1 });
  expect(await found(ada.as, "krone")).toEqual(["no-1-krone-1999"]);
  // Found by its country's name in every language, as imported entries are.
  expect(await found(ada.as, "norwegen krone")).toEqual(["no-1-krone-1999"]);
  // Browsed under its country, by denomination.
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "no" }),
  ).toEqual([{ denomination: "1 krone", seriesCount: 1 }]);
});

test("an admin edits every value of a Catalog entry; a value left out is cleared", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);

  const edited = {
    title: "1 krone 1999 (proof)",
    sortOrder: 7,
    itemType: "coin" as const,
    country: "NO",
    denomination: "1 krone",
    series: "Olav V",
    material: "cupronickel" as const,
    strike: "proof" as const,
    weight: 4.35,
    fineness: 0.75,
    diameter: 21,
    yearFrom: 1999,
    yearTo: 2001,
    mint: "Royal Norwegian Mint",
    mintMark: "none",
    composition: "copper 75%; nickel 25%",
    edge: "lettered" as const,
    edgeLettering: "ALT FOR NORGE",
    thickness: 1.7,
    designers: "Ingrid Austlid Rise; Øivind Hansen",
    mintage: 120000,
    issueDate: "1999-03",
    withdrawalDate: "2001-12-31",
    notesLanguage: "nb",
    technicalDetails: "Hull i midten.",
    historicalNotes: "Preget på Kongsberg.",
    historicalNotesEn: "Struck at Kongsberg.",
    technicalDetailsDe: "Loch in der Mitte.",
    notesEnSource: "CoinsLite editorial translation",
    notesEnAuthor: "CoinsLite",
    notesEnLicence: "CoinsLite",
    notesEnLink: "https://coinslite.example/",
    notesDeSource: "CoinsLite editorial translation",
    notesDeAuthor: "CoinsLite",
    notesDeLicence: "CoinsLite",
    notesDeLink: "https://coinslite.example/",
    numistaId: 1234,
    factsSource: "Norges Bank",
    factsAuthor: "Norges Bank",
    factsLicence: "Public domain",
    factsLink: "https://www.norges-bank.no/",
    notesSource: "CoinsLite",
    notesAuthor: "CoinsLite editors",
    notesLicence: "CC BY 4.0",
    notesLink: "https://coinslite.example/",
  };
  await admin.as.mutation(api.catalog.editor.update, {
    key: "no-1-krone-1999",
    addable: true,
    values: edited,
  });

  expect(
    await admin.as.query(api.catalog.editor.node, { key: "no-1-krone-1999" }),
  ).toMatchObject({
    key: "no-1-krone-1999",
    kind: "entry",
    parentKey: "no-coins",
    ancestors: [
      { key: "no", title: "Norway" },
      { key: "no-coins", title: "Coins" },
    ],
    values: edited,
  });
  expect(await found(ada.as, "olav")).toEqual(["no-1-krone-1999"]);
  expect(await rootCounts(ada.as)).toEqual({ no: 1 });

  expect(
    await ada.as.query(api.catalog.browse.node, {
      key: "no-1-krone-1999",
      language: "de",
    }),
  ).toMatchObject({
    mintMark: "none",
    composition: [
      { metal: "copper", percent: 75 },
      { metal: "nickel", percent: 25 },
    ],
    designers: ["Ingrid Austlid Rise", "Øivind Hansen"],
    notes: {
      technical: { text: "Loch in der Mitte.", language: "de" },
      historical: { text: "Preget på Kongsberg.", language: "nb" },
    },
  });

  // Saved again without its series, notes and translations: those are cleared.
  const {
    series,
    historicalNotes,
    technicalDetails,
    notesLanguage,
    historicalNotesEn,
    technicalDetailsDe,
    notesEnSource,
    notesEnAuthor,
    notesEnLicence,
    notesEnLink,
    notesDeSource,
    notesDeAuthor,
    notesDeLicence,
    notesDeLink,
    ...kept
  } = edited;
  const { notesSource, notesAuthor, notesLicence, notesLink, ...rest } = kept;
  await admin.as.mutation(api.catalog.editor.update, {
    key: "no-1-krone-1999",
    addable: true,
    values: rest,
  });
  const node = await admin.as.query(api.catalog.editor.node, {
    key: "no-1-krone-1999",
  });
  expect(node?.values).toEqual(rest);
  expect(await found(ada.as, "olav")).toEqual([]);
});

/** A silver coin entry below Norway › Coins, as the editor saves it. */
const jubilee = coinValues("200 kroner 1994", {
  country: "NO",
  denomination: "200 kroner",
  series: "Olympic Games",
  material: "silver",
  strike: "proof",
  metal: "silver",
  weight: 26.73,
  fineness: 0.925,
  diameter: 39,
  yearFrom: 1994,
});

async function withJubilee(admin: Caller) {
  await norway(admin);
  await admin.mutation(api.catalog.editor.create, {
    parentKey: "no-coins",
    key: "no-200-kroner-1994",
    addable: true,
    values: jubilee,
  });
}

test("an edit reaches the Items linked to the entry at once, and the facts people changed are kept", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  await withJubilee(admin.as);
  const adasItem = await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-200-kroner-1994",
  });
  const bosItem = await bo.as.mutation(api.items.add, {
    type: "coin",
    title: "Lillehammer 200",
    catalogEntryKey: "no-200-kroner-1994",
    series: "Lillehammer 1994",
    weight: 26.5,
  });

  await admin.as.mutation(api.catalog.editor.update, {
    key: "no-200-kroner-1994",
    addable: true,
    values: {
      ...jubilee,
      series: "XVII Olympic Winter Games",
      strike: "bu",
      weight: 26.8,
      fineness: 0.9,
      diameter: 39.5,
    },
  });

  expect(await ada.as.query(api.items.get, { itemId: adasItem })).toMatchObject(
    {
      series: "XVII Olympic Winter Games",
      strike: "bu",
      weight: 26.8,
      purity: 0.9,
      diameter: 39.5,
    },
  );
  expect(await bo.as.query(api.items.get, { itemId: bosItem })).toMatchObject({
    title: "Lillehammer 200",
    // Bo's own
    series: "Lillehammer 1994",
    weight: 26.5,
    // The entry's, as corrected
    strike: "bu",
    purity: 0.9,
    diameter: 39.5,
  });
});

test("an entry's Item type reaches its linked Items, which drop what the new type has no place for", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);
  await admin.as.mutation(api.catalog.editor.create, {
    parentKey: "no-coins",
    key: "no-100-kroner-1949",
    addable: true,
    values: coinValues("100 kroner 1949", { country: "NO", yearFrom: 1949 }),
  });
  const itemId = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "100 kroner 1949",
    catalogEntryKey: "no-100-kroner-1949",
    material: "copper",
    thickness: 0.1,
    ruler: "Haakon VII",
  });

  // It was never a coin: corrected to a banknote.
  await admin.as.mutation(api.catalog.editor.update, {
    key: "no-100-kroner-1949",
    addable: true,
    values: {
      title: "100 kroner 1949",
      sortOrder: 0,
      itemType: "banknote",
      country: "NO",
      yearFrom: 1949,
      ...norgesBank,
    },
  });

  const item = await ada.as.query(api.items.get, { itemId });
  expect(item).toMatchObject({ type: "banknote", ruler: "Haakon VII" });
  expect(item?.material).toBeUndefined();
  expect(item?.thickness).toBeUndefined();
  expect(
    await t.run((ctx) => collectionCountsOf(ctx, ada.userId)),
  ).toMatchObject({ items: 1, coins: 0, banknotes: 1 });
});

test("a Catalog entry that Items link to stays an entry", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-1-krone-1999",
  });
  const entry = (await admin.as.query(api.catalog.editor.node, {
    key: "no-1-krone-1999",
  }))!;

  await expect(
    admin.as.mutation(api.catalog.editor.update, {
      key: "no-1-krone-1999",
      addable: false,
      values: entry.values,
    }),
  ).rejects.toThrow("ENTRY_HAS_ITEMS");
  // A CSV file can't do it either.
  const report = await admin.as.query(api.catalog.csv.preview, {
    csv: "id,title,is_addable\nno-1-krone-1999,1 krone 1999,false\n",
  });
  expect(report.errors).toEqual([
    { row: 2, column: "is_addable", code: "ENTRY_HAS_ITEMS" },
  ]);
});

test("before a delete, the admin sees how many nodes go with it and how many Items link to entries there", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  await withJubilee(admin.as);
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-1-krone-1999",
  });
  await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-200-kroner-1994",
  });
  await bo.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-200-kroner-1994",
    quantity: 3,
  });
  const deletion = (key: string) =>
    admin.as.query(api.catalog.editor.deletion, { key });

  expect(await deletion("no")).toEqual({
    nodesBelow: 3,
    linkedItems: 3,
    tooLarge: false,
  });
  expect(await deletion("no-coins")).toEqual({
    nodesBelow: 2,
    linkedItems: 3,
    tooLarge: false,
  });
  expect(await deletion("no-200-kroner-1994")).toEqual({
    nodesBelow: 0,
    linkedItems: 2,
    tooLarge: false,
  });
  expect(await deletion("nowhere")).toBeNull();
});

test("deleting a node deletes everything below it, and the entry counts above follow", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await withJubilee(admin.as);
  await admin.as.mutation(api.catalog.editor.create, {
    parentKey: "no",
    key: "no-1875-krone",
    addable: true,
    values: coinValues("1 krone 1875", { country: "NO", yearFrom: 1875 }),
  });
  expect(await rootCounts(ada.as)).toEqual({ no: 3 });

  await admin.as.mutation(api.catalog.editor.remove, { key: "no-coins" });

  expect(await rootCounts(ada.as)).toEqual({ no: 1 });
  const left = await admin.as.query(api.catalog.editor.children, {
    parentKey: "no",
    paginationOpts: firstPage,
  });
  expect(left.page.map((node) => node.key)).toEqual(["no-1875-krone"]);
  for (const key of ["no-coins", "no-1-krone-1999", "no-200-kroner-1994"]) {
    expect(await admin.as.query(api.catalog.editor.node, { key })).toBeNull();
  }
  expect(await found(ada.as, "krone")).toEqual(["no-1875-krone"]);
  await expect(
    admin.as.mutation(api.catalog.editor.remove, { key: "no-coins" }),
  ).rejects.toThrow("CATALOG_NODE_NOT_FOUND");
});

test("Items linked to a deleted entry keep its facts as their own, and the ones their owners changed", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  const bo = await person(t, "bo@example.com");
  await withJubilee(admin.as);
  const adasItem = await ada.as.mutation(api.items.quickAdd, {
    catalogEntryKey: "no-200-kroner-1994",
    quantity: 2,
  });
  const bosItem = await bo.as.mutation(api.items.add, {
    type: "coin",
    title: "Lillehammer 200",
    catalogEntryKey: "no-200-kroner-1994",
    series: "Lillehammer 1994",
  });
  const entryFacts = {
    country: "NO",
    year: 1994,
    denomination: "200 kroner",
    material: "silver",
    strike: "proof",
    diameter: 39,
    metal: "silver",
    weight: 26.73,
    purity: 0.925,
  };

  await admin.as.mutation(api.catalog.editor.remove, { key: "no" });

  expect(await ada.as.query(api.items.get, { itemId: adasItem })).toMatchObject(
    {
      ...entryFacts,
      series: "Olympic Games",
      quantity: 2,
      catalogEntry: null,
    },
  );
  expect(await bo.as.query(api.items.get, { itemId: bosItem })).toMatchObject({
    ...entryFacts,
    title: "Lillehammer 200",
    series: "Lillehammer 1994",
    catalogEntry: null,
  });
  // They are Items of their own now: no longer linked to anything.
  const links = await t.run(async (ctx) =>
    (await ctx.db.query("items").collect()).map(
      (item) => item.catalogEntryId ?? null,
    ),
  );
  expect(links).toEqual([null, null]);
  expect(
    await t.run((ctx) => collectionCountsOf(ctx, ada.userId)),
  ).toMatchObject({ items: 1, coins: 1 });
});

test("deleting an entry deletes its uploaded image files", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await withJubilee(admin.as);
  const files = await t.run(async (ctx) => {
    const full = await ctx.storage.store(new Blob(["full"]));
    const thumbnail = await ctx.storage.store(new Blob(["thumbnail"]));
    const entry = await ctx.db
      .query("catalogNodes")
      .withIndex("by_key", (q) => q.eq("key", "no-200-kroner-1994"))
      .unique();
    await ctx.db.patch("catalogNodes", entry!._id, {
      imageFiles: { full, thumbnail },
      imageProvenance: {
        source: "Norges Bank",
        author: "Norges Bank",
        licence: "Public domain",
        link: "https://www.norges-bank.no/",
      },
    });
    return [full, thumbnail];
  });

  await admin.as.mutation(api.catalog.editor.remove, {
    key: "no-200-kroner-1994",
  });

  const left = await t.run(async (ctx) =>
    Promise.all(files.map((file) => ctx.storage.get(file))),
  );
  expect(left).toEqual([null, null]);
});

test("a save meets the same rules as an imported row, and changes nothing when it doesn't", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await norway(admin.as);
  const add = (
    parentKey: string | null,
    key: string,
    values: EditorValues,
    addable = true,
  ) =>
    admin.as.mutation(api.catalog.editor.create, {
      parentKey,
      key,
      addable,
      values,
    });
  const coin = coinValues("2 kroner");

  await expect(
    add("no-coins", "no-2", { ...coin, title: "  " }),
  ).rejects.toThrow("TITLE_REQUIRED");
  await expect(
    add("no-coins", "no-2", { ...coin, itemType: undefined }),
  ).rejects.toThrow("ITEM_TYPE_REQUIRED");
  await expect(
    add("no-coins", "no-2", { ...coin, itemType: "banknote", weight: 5 }),
  ).rejects.toThrow("FIELD_NOT_FOR_TYPE");
  await expect(
    add("no-coins", "no-2", { ...coin, yearFrom: 2001, yearTo: 1999 }),
  ).rejects.toThrow("YEARS_REVERSED");
  await expect(
    add("no-coins", "no-2", {
      ...coin,
      factsSource: undefined,
      yearFrom: 2001,
    }),
  ).rejects.toThrow("SOURCE_REQUIRED");
  await expect(
    add("no-coins", "no-2", { ...coin, notesSource: "Numista" }),
  ).rejects.toThrow("NUMISTA_DATA");
  await expect(
    add("no-coins", "no-2", { ...coin, fineness: 1.5 }),
  ).rejects.toThrow("INVALID_NUMBER");
  await expect(
    add("no-coins", "no-2", { ...coin, country: "XX" }),
  ).rejects.toThrow("INVALID_COUNTRY");
  await expect(
    add("no-coins", "no-2", { ...coin, composition: "copper 75%; zinc 50%" }),
  ).rejects.toThrow("INVALID_VALUE");
  await expect(
    add("no-coins", "no-2", { ...coin, issueDate: "1999-02-30" }),
  ).rejects.toThrow("INVALID_DATE");
  await expect(
    add("no-coins", "no-2", {
      ...coin,
      issueDate: "1999",
      withdrawalDate: "1998",
    }),
  ).rejects.toThrow("DATES_REVERSED");
  await expect(
    add("no-coins", "no-2", { ...coin, itemType: "banknote", mint: "Oslo" }),
  ).rejects.toThrow("FIELD_NOT_FOR_TYPE");
  await expect(
    add("no-coins", "no-2", {
      ...coin,
      historicalNotesFr: "Une pièce.",
    }),
  ).rejects.toThrow("SOURCE_REQUIRED");
  await expect(
    add("no-coins", "no-2", {
      ...coin,
      historicalNotes: "A coin.",
      notesSource: "CoinsLite",
      notesAuthor: "CoinsLite",
      notesLicence: "CoinsLite",
      notesLink: "https://coinslite.example/",
      historicalNotesEn: "A coin, again.",
      notesEnSource: "CoinsLite",
      notesEnAuthor: "CoinsLite",
      notesEnLicence: "CoinsLite",
      notesEnLink: "https://coinslite.example/",
    }),
  ).rejects.toThrow("SAME_LANGUAGE");
  await expect(add("no-coins", "No 2!", coin)).rejects.toThrow("INVALID_ID");
  await expect(add("no-coins", " ", coin)).rejects.toThrow("ID_REQUIRED");
  await expect(add("no-coins", "no-coins", coin)).rejects.toThrow(
    "DUPLICATE_ID",
  );
  await expect(add("no-1-krone-1999", "no-2", coin)).rejects.toThrow(
    "PARENT_IS_ENTRY",
  );
  await expect(add("nowhere", "no-2", coin)).rejects.toThrow(
    "PARENT_NOT_FOUND",
  );
  await expect(add(null, "no-2", coin)).rejects.toThrow("ROOT_NOT_ADDABLE");
  // A grouping with nodes below it can't become an entry.
  await expect(
    admin.as.mutation(api.catalog.editor.update, {
      key: "no-coins",
      addable: true,
      values: coin,
    }),
  ).rejects.toThrow("ENTRY_HAS_CHILDREN");
  await expect(
    admin.as.mutation(api.catalog.editor.update, {
      key: "nowhere",
      addable: false,
      values: coin,
    }),
  ).rejects.toThrow("CATALOG_NODE_NOT_FOUND");

  const below = await admin.as.query(api.catalog.editor.children, {
    parentKey: "no-coins",
    paginationOpts: firstPage,
  });
  expect(below.page.map((node) => node.key)).toEqual(["no-1-krone-1999"]);

  // Ids are lowercased, as in CSV files.
  expect(await add("no-coins", " NO-2-KRONER ", coin)).toBe("no-2-kroner");
});

/** Gives `count` Items linked to an entry to one person, directly. */
async function linkItems(
  t: Test,
  ownerId: Awaited<ReturnType<typeof person>>["userId"],
  entryKey: string,
  count: number,
) {
  await t.run(async (ctx) => {
    const entry = await ctx.db
      .query("catalogNodes")
      .withIndex("by_key", (q) => q.eq("key", entryKey))
      .unique();
    for (let i = 0; i < count; i++) {
      await ctx.db.insert("items", {
        ownerId,
        type: "coin",
        title: entry!.title,
        quantity: 1,
        catalogEntryId: entry!._id,
      });
    }
  });
}

test("a delete or an Item type change that would update more linked Items than one save may is refused", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);
  await linkItems(
    t,
    ada.userId,
    "no-1-krone-1999",
    catalogLimits.linkedItems + 1,
  );

  expect(
    await admin.as.query(api.catalog.editor.deletion, { key: "no-coins" }),
  ).toMatchObject({ nodesBelow: 1, tooLarge: true });
  await expect(
    admin.as.mutation(api.catalog.editor.remove, { key: "no-coins" }),
  ).rejects.toThrow("DELETE_TOO_LARGE");

  const entry = (await admin.as.query(api.catalog.editor.node, {
    key: "no-1-krone-1999",
  }))!;
  await expect(
    admin.as.mutation(api.catalog.editor.update, {
      key: "no-1-krone-1999",
      addable: true,
      values: { ...entry.values, itemType: "banknote" },
    }),
  ).rejects.toThrow("TOO_MANY_LINKED_ITEMS");
  expect(
    await admin.as.query(api.catalog.editor.node, { key: "no-1-krone-1999" }),
  ).toMatchObject({ values: { itemType: "coin" } });
});

test("only admins can use the Catalog editor", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);
  const values = coinValues("2 kroner");
  const calls = (as: Test | Caller) => [
    () =>
      as.query(api.catalog.editor.children, {
        parentKey: null,
        paginationOpts: firstPage,
      }),
    () => as.query(api.catalog.editor.node, { key: "no" }),
    () => as.query(api.catalog.editor.deletion, { key: "no" }),
    () =>
      as.mutation(api.catalog.editor.create, {
        parentKey: "no-coins",
        key: "no-2",
        addable: true,
        values,
      }),
    () =>
      as.mutation(api.catalog.editor.update, {
        key: "no-1-krone-1999",
        addable: true,
        values,
      }),
    () => as.mutation(api.catalog.editor.remove, { key: "no" }),
  ];

  for (const call of calls(t))
    await expect(call()).rejects.toThrow("NOT_SIGNED_IN");
  for (const call of calls(ada.as))
    await expect(call()).rejects.toThrow("NOT_ADMIN");
  // Nothing changed.
  expect(await rootCounts(ada.as)).toEqual({ no: 1 });
  expect(await found(ada.as, "2 kroner")).toEqual([]);
});

test("a root without a country is a Theme, and its entries are browsed under the countries below it", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await norway(admin.as);

  // Norway's country cleared: it becomes a Theme, with "Coins" as its country.
  await admin.as.mutation(api.catalog.editor.update, {
    key: "no",
    addable: false,
    values: { title: "Nordic coins", sortOrder: 0 },
  });

  expect(
    await admin.as.query(api.catalog.editor.node, { key: "no" }),
  ).toMatchObject({ kind: "theme", values: { title: "Nordic coins" } });
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "no-coins" }),
  ).toEqual([{ denomination: "1 krone", seriesCount: 1 }]);

  // And back again.
  await admin.as.mutation(api.catalog.editor.update, {
    key: "no",
    addable: false,
    values: { title: "Norway", sortOrder: 0, country: "NO" },
  });
  expect(
    await ada.as.query(api.catalog.browse.denominations, { key: "no" }),
  ).toEqual([{ denomination: "1 krone", seriesCount: 1 }]);
});
