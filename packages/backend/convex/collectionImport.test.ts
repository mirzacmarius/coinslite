/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { formatCsvRecord } from "./catalog/csvText";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof newTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in. */
async function person(
  t: Test,
  email: string,
  extra: { language?: "en" | "nb" | "de" | "fr" | "ro" } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
      ...extra,
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Person = Awaited<ReturnType<typeof person>>;
type NewItem = FunctionArgs<typeof api.items.add>;

/** Makes a person Premium, as a confirmed Polar subscription would. */
async function subscribe(t: Test, userId: Id<"users">) {
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

/** Previews a file, then adds every row it accepts in batches, as the app does. */
async function importFile(who: Person, text: string) {
  const preview = await who.as.action(api.collectionImport.preview, { text });
  for (let start = 0; start < preview.rows.length; start += 100)
    await who.as.mutation(api.collectionImport.addBatch, {
      rows: preview.rows.slice(start, start + 100),
    });
  return preview;
}

/** Every Item's stored fields that a file can carry, oldest first. */
async function itemsOf(t: Test, ownerId: Id<"users">) {
  const items = await t.run((ctx) =>
    ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .collect(),
  );
  return items.map(
    ({ _id, _creationTime, ownerId: _, ...fields }: Doc<"items">) => fields,
  );
}

const morgan: NewItem = {
  type: "coin",
  title: "Morgan dollar 1881-S",
  year: 1881,
  denomination: "1 dollar",
  gradingScale: "sheldon",
  grade: "65",
  strike: "proof",
  material: "silver",
  materialNote: "0.900",
  country: "US",
  quantity: 2,
  purchasePrice: 125050,
  marketValue: 99,
  purchaseDate: "2024-03-05",
  source: "Auction, Oslo",
};
const krone: NewItem = {
  type: "coin",
  title: "1 krone 1908",
  gradingScale: "norwegian",
  grade: "1-",
  country: "NO",
};
const posthorn: NewItem = {
  type: "stamp",
  title: "Posthorn",
  gradingScale: "stamp",
  grade: "mnh",
  country: "SE",
};
const note: NewItem = {
  type: "banknote",
  title: '100 kroner "Viking"',
  gradingScale: "international",
  grade: "AU",
  strike: "circulation",
};

test("a file exported from the account imports again with equal Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await subscribe(t, ada.userId);
  for (const item of [morgan, krone, posthorn, note])
    await ada.as.mutation(api.items.add, item);
  const sold = await ada.as.mutation(api.items.add, {
    type: "coin",
    title: "Sold krone",
  });
  await ada.as.mutation(api.items.sell, {
    itemId: sold,
    soldOn: "2026-10-01",
    salePrice: 2500,
    saleNote: "Fair",
  });
  const exported = async (view: { status?: "sold" }) =>
    ada.as.query(api.collection.exports.csv, { view });
  const before = await itemsOf(t, ada.userId);
  const bob = await person(t, "bob@example.com");

  const owned = await importFile(bob, await exported({}));
  const soldOnes = await importFile(bob, await exported({ status: "sold" }));

  expect(owned.rejected).toEqual([]);
  expect(soldOnes.rejected).toEqual([]);
  const byTitle = (items: Array<{ title: string }>) =>
    [...items].sort((a, b) => a.title.localeCompare(b.title));
  expect(byTitle(await itemsOf(t, bob.userId))).toEqual(byTitle(before));
});

/** A CSV file from rows of cells, the first row being the headings. */
const csv = (...rows: string[][]) =>
  rows.map((cells) => cells.join(",")).join("\r\n");

test("the preview lists the rows to add and the rejected ones with their row numbers and reasons, and writes nothing", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const file = csv(
    [
      "Item type",
      "Title",
      "Grade",
      "Grading scale",
      "Year",
      "Purchase price",
      "Currency",
      "Purchase date",
      "Country",
    ],
    [
      "Coin",
      "1 krone 1908",
      "1-",
      "Norwegian (0–3)",
      "1908",
      "120.50",
      "NOK",
      "2024-05-01",
      "Norway",
    ],
    ["Spoon", "A spoon", "", "", "", "", "", "", ""],
    ["Coin", "Bad Grade", "ZZ", "European (UNC–G)", "", "", "", "", ""],
    ["Coin", "Bad date", "", "", "", "", "", "2024-02-30", ""],
    ["Coin", "Bad amount", "", "", "", "ten", "", "", ""],
    ["Coin", "In euros", "", "", "", "10.00", "EUR", "", ""],
    ["Coin", "", "", "", "", "", "", "", ""],
    ["Banknote", "Loose note", "", "", "", "", "", "", "Atlantis"],
  );

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: file,
  });

  expect(preview.rows.map((row) => [row.row, row.title])).toEqual([
    [2, "1 krone 1908"],
  ]);
  expect(preview.rows[0]).toMatchObject({
    type: "coin",
    gradingScale: "norwegian",
    grade: "1-",
    year: 1908,
    purchasePrice: 12050,
    purchaseDate: "2024-05-01",
    country: "NO",
  });
  expect(preview.rejected).toEqual([
    { row: 3, reason: "UNKNOWN_TYPE" },
    { row: 4, reason: "INVALID_GRADE" },
    { row: 5, reason: "INVALID_DATE" },
    { row: 6, reason: "INVALID_AMOUNT" },
    { row: 7, reason: "OTHER_CURRENCY" },
    { row: 8, reason: "TITLE_REQUIRED" },
    { row: 9, reason: "INVALID_COUNTRY" },
  ]);
  expect(preview.itemsLeft).toBe(50);
  expect(await itemsOf(t, ada.userId)).toEqual([]);
});

test("a file too large, with too many rows, unreadable or with no heading it knows is refused", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const preview = (text: string) =>
    ada.as.action(api.collectionImport.preview, { text });

  await expect(preview("x".repeat(5 * 1024 * 1024 + 1))).rejects.toThrow(
    "FILE_TOO_LARGE",
  );
  await expect(
    preview(csv(["Title"], ...Array.from({ length: 2001 }, () => ["Krone"]))),
  ).rejects.toThrow("TOO_MANY_ROWS");
  await expect(preview('Title\r\n"Krone')).rejects.toThrow("UNREADABLE_FILE");
  await expect(
    preview(csv(["Colour", "Shape"], ["Red", "Round"])),
  ).rejects.toThrow("NO_KNOWN_HEADINGS");
  await expect(preview(csv(["Title"]))).rejects.toThrow("NO_ROWS");
  // At the limits it's fine.
  const full = await preview(
    csv(
      ["Item type", "Title"],
      ...Array.from({ length: 2000 }, () => ["Coin", "Krone"]),
    ),
  );
  expect(full.rows).toHaveLength(2000);
});

const kroner = (count: number) =>
  csv(
    ["Item type", "Title"],
    ...Array.from({ length: count }, (_, n) => ["Coin", `Krone ${n + 1}`]),
  );

test("on the Free plan the preview says how many fit, and a batch past the limit is refused", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n < 47; n++)
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "coin",
        title: `Old ${n}`,
        quantity: 1,
      });
  });

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: kroner(5),
  });
  expect(preview.rows).toHaveLength(5);
  expect(preview.itemsLeft).toBe(3);

  await expect(
    ada.as.mutation(api.collectionImport.addBatch, { rows: preview.rows }),
  ).rejects.toThrow("ITEM_LIMIT_REACHED");
  // The first rows that fit go in.
  await ada.as.mutation(api.collectionImport.addBatch, {
    rows: preview.rows.slice(0, 3),
  });
  expect(await itemsOf(t, ada.userId)).toHaveLength(50);

  await subscribe(t, ada.userId);
  const premium = await ada.as.action(api.collectionImport.preview, {
    text: kroner(1),
  });
  expect(premium.itemsLeft).toBeNull();
});

test("a batch is all or nothing: one row failing its checks refuses the batch, naming the row", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const { rows } = await ada.as.action(api.collectionImport.preview, {
    text: kroner(3),
  });
  const broken = rows.map((row, index) =>
    index === 1 ? { ...row, title: "" } : row,
  );

  await expect(
    ada.as.mutation(api.collectionImport.addBatch, { rows: broken }),
  ).rejects.toThrow(/TITLE_REQUIRED/);
  expect(await itemsOf(t, ada.userId)).toEqual([]);
  await expect(
    ada.as.mutation(api.collectionImport.addBatch, {
      rows: Array.from({ length: 101 }, () => rows[0]!),
    }),
  ).rejects.toThrow("BATCH_TOO_LARGE");
});

test.each(["en", "nb", "de", "fr", "ro"] as const)(
  "a file exported in %s imports with the same Items",
  async (locale) => {
    const t = newTest();
    const ada = await person(t, "ada@example.com");
    await subscribe(t, ada.userId);
    for (const item of [morgan, krone, posthorn, note])
      await ada.as.mutation(api.items.add, item);
    const before = await itemsOf(t, ada.userId);
    const file = await ada.as.query(api.collection.exports.csv, {
      view: {},
      locale,
    });
    const kari = await person(t, "kari@example.com", { language: "de" });

    const preview = await importFile(kari, file);

    expect(preview.rejected).toEqual([]);
    expect(preview.ignoredHeadings).toEqual([]);
    const byTitle = (items: Array<{ title: string }>) =>
      [...items].sort((a, b) => a.title.localeCompare(b.title));
    expect(byTitle(await itemsOf(t, kari.userId))).toEqual(byTitle(before));
  },
);

test("headings it doesn't know are listed as ignored, and raw column keys work too", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: csv(
      ["type", "title", "Colour", "notes", "Shape"],
      ["coin", "Krone", "Red", "From grandad", "Round"],
    ),
  });

  expect(preview.ignoredHeadings).toEqual(["Colour", "Shape"]);
  expect(preview.rows).toEqual([
    { row: 2, type: "coin", title: "Krone", notes: "From grandad" },
  ]);
});

test("rows naming an Album go into it: an existing one, or a new one made once", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, { name: "Travel" });

  const preview = await importFile(
    ada,
    csv(
      ["Item type", "Title", "album"],
      ["Coin", "Krone 1", " travel "],
      ["Coin", "Krone 2", "Gifts"],
      ["Coin", "Krone 3", "gifts"],
      ["Coin", "Krone 4", ""],
    ),
  );

  expect(preview.albumsToCreate).toEqual(["Gifts"]);
  const albums = await ada.as.query(api.albums.list, {});
  expect(albums.map(({ name, itemCount }) => [name, itemCount])).toEqual([
    ["Travel", 1],
    ["Gifts", 2],
  ]);
  const items = await itemsOf(t, ada.userId);
  expect(items.map(({ title, albumId }) => [title, albumId ?? null])).toEqual([
    ["Krone 1", travel],
    ["Krone 2", albums[1]!._id],
    ["Krone 3", albums[1]!._id],
    ["Krone 4", null],
  ]);
});

test("new Albums stop at the Album limit; rows naming one past it are rejected", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n < 499; n++)
      await ctx.db.insert("albums", {
        ownerId: ada.userId,
        name: `Album ${n}`,
        colour: "blue",
        itemCount: 0,
      });
  });

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: csv(
      ["Item type", "Title", "album"],
      ["Coin", "Krone 1", "One more"],
      ["Coin", "Krone 2", "Too many"],
      ["Coin", "Krone 3", "Album 7"],
    ),
  });

  expect(preview.albumsToCreate).toEqual(["One more"]);
  expect(preview.rows.map((row) => row.title)).toEqual(["Krone 1", "Krone 3"]);
  expect(preview.rejected).toEqual([{ row: 3, reason: "TOO_MANY_ALBUMS" }]);
});

/** A Catalog with the United States and one Morgan dollar, imported by an admin. */
async function withCatalog(t: Test) {
  const adminId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "admin@example.com",
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
      role: "admin" as const,
    }),
  );
  const rows: Record<string, string>[] = [
    { id: "us", title: "United States", country: "US" },
    {
      id: "us-morgan-1881-cc",
      parent_id: "us",
      title: "Morgan dollar 1881-CC",
      item_type: "coin",
      is_addable: "true",
      country: "US",
      denomination: "1 dollar",
      material: "silver",
      year_from: "1881",
      year_to: "1881",
      facts_source: "United States Mint",
      facts_author: "United States Mint",
      facts_licence: "Public domain",
      facts_link: "https://example.org/facts",
    },
  ];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const file = [
    formatCsvRecord(columns),
    ...rows.map((row) => formatCsvRecord(columns.map((c) => row[c] ?? ""))),
  ].join("");
  const report = await t
    .withIdentity({ subject: `${adminId}|session` })
    .mutation(api.catalog.csv.importFile, { csv: file });
  if (!report.applied) throw new Error(JSON.stringify(report.errors));
}

test("rows naming a Catalog entry link to it, keeping only the values that differ; an unknown key is rejected", async () => {
  const t = newTest();
  await withCatalog(t);
  const ada = await person(t, "ada@example.com");

  const preview = await importFile(
    ada,
    csv(
      [
        "Item type",
        "Title",
        "Year",
        "Denomination",
        "Country",
        "catalog_entry",
      ],
      [
        "Coin",
        "My Morgan",
        "1881",
        "One dollar",
        "United States",
        "us-morgan-1881-cc",
      ],
      ["Coin", "Lost", "", "", "", "us-nothing"],
    ),
  );

  expect(preview.linked).toBe(1);
  expect(preview.rejected).toEqual([
    { row: 3, reason: "UNKNOWN_CATALOG_ENTRY" },
  ]);
  const [item] = await itemsOf(t, ada.userId);
  expect(item).toMatchObject({
    title: "My Morgan",
    denomination: "One dollar",
  });
  expect(item?.catalogEntryId).toBeDefined();
  // The year and country are the entry's, so the Item follows them.
  expect(item?.year).toBeUndefined();
  expect(item?.country).toBeUndefined();
  const shown = await ada.as.query(api.items.get, {
    itemId: (await t.run((ctx) => ctx.db.query("items").first()))!._id,
  });
  expect(shown).toMatchObject({ year: 1881, country: "US" });
});

test("while the Catalog is hidden, a row naming an entry is rejected", async () => {
  const t = newTest();
  await withCatalog(t);
  const ada = await person(t, "ada@example.com");
  await t.run((ctx) =>
    ctx.db.insert("featureFlags", { key: "catalogVisible", value: false }),
  );

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: csv(
      ["Item type", "Title", "catalog_entry"],
      ["Coin", "My Morgan", "us-morgan-1881-cc"],
    ),
  });

  expect(preview.rejected).toEqual([
    { row: 2, reason: "UNKNOWN_CATALOG_ENTRY" },
  ]);
});

test("row numbers count the file's own rows, blank ones included, and European amounts read too", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: [
      "Item type,Title,Purchase price",
      "",
      'Coin,Krone,"1.250,50"',
      "Spoon,A spoon,",
      "Coin,Krone 2,1.250",
    ].join("\r\n"),
  });

  expect(preview.rows.map((row) => [row.row, row.purchasePrice])).toEqual([
    [3, 125050],
    [5, 125000],
  ]);
  expect(preview.rejected).toEqual([{ row: 4, reason: "UNKNOWN_TYPE" }]);
});

test("the Album limit counts Albums, even two whose names differ only in capitals", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n < 499; n++)
      await ctx.db.insert("albums", {
        ownerId: ada.userId,
        name: n === 0 ? "euro" : `Album ${n}`,
        colour: "blue",
        itemCount: 0,
      });
    await ctx.db.insert("albums", {
      ownerId: ada.userId,
      name: "Euro",
      colour: "blue",
      itemCount: 0,
    });
  });
  const file = csv(["Item type", "Title", "album"], ["Coin", "Krone", "New"]);

  const preview = await ada.as.action(api.collectionImport.preview, {
    text: file,
  });
  expect(preview.rejected).toEqual([{ row: 2, reason: "TOO_MANY_ALBUMS" }]);
  await expect(
    ada.as.mutation(api.collectionImport.addBatch, {
      rows: [{ row: 2, type: "coin", title: "Krone", album: "New" }],
    }),
  ).rejects.toThrow("TOO_MANY_ALBUMS");
});
