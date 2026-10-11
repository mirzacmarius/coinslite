/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { parseCsv } from "./catalog/csvText";
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
  extra: { setUp?: boolean; language?: "en" | "nb" | "de" | "fr" | "ro" } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
      ...(extra.language && { language: extra.language }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

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

async function premiumMember(
  t: Test,
  email: string,
  extra: Parameters<typeof person>[2] = {},
) {
  const who = await person(t, email, extra);
  await subscribe(t, who.userId);
  return who;
}

type Person = Awaited<ReturnType<typeof person>>;
type NewItem = FunctionArgs<typeof api.items.add>;
type ExportArgs = FunctionArgs<typeof api.collection.exports.csv>;

async function addAll(who: Person, items: NewItem[]) {
  const ids = [];
  for (const item of items)
    ids.push(await who.as.mutation(api.items.add, item));
  return ids;
}

const byteOrderMark = "﻿";

/** The exported file's records: the header row first. */
async function exported(
  who: Person,
  view: ExportArgs["view"] = {},
  options: Omit<ExportArgs, "view"> = {},
) {
  const csv = await who.as.query(api.collection.exports.csv, {
    view,
    ...options,
  });
  expect(csv.startsWith(byteOrderMark)).toBe(true);
  const parsed = parseCsv(csv);
  if (!("records" in parsed)) throw new Error("The file doesn't parse");
  return parsed.records;
}

const englishHeader = [
  "Item type",
  "Title",
  "Year",
  "Denomination",
  "Grade",
  "Grading scale",
  "Strike",
  "Material",
  "Country",
  "Quantity",
  "Purchase price",
  "Market value",
  "Currency",
  "Purchase date",
  "Source",
  "Sold on",
  "Sale price",
  "Sale note",
];

test("a Premium member's export has a header row and one row per Item, every column filled from the Item", async () => {
  const t = newTest();
  const ada = await premiumMember(t, "ada@example.com");
  await addAll(ada, [
    {
      type: "coin",
      title: "Morgan dollar 1881-S",
      year: 1881,
      denomination: "1 dollar",
      gradingScale: "sheldon",
      grade: "65",
      strike: "proof",
      material: "silver",
      country: "US",
      quantity: 2,
      purchasePrice: 125050,
      marketValue: 99,
      purchaseDate: "2024-03-05",
      source: "Auction",
    },
  ]);

  expect(await exported(ada)).toEqual([
    englishHeader,
    [
      "Coin",
      "Morgan dollar 1881-S",
      "1881",
      "1 dollar",
      "PF-65",
      "Sheldon (1–70)",
      "Proof",
      "Silver",
      "United States",
      "2",
      "1250.50",
      "0.99",
      "NOK",
      "2024-03-05",
      "Auction",
      "",
      "",
      "",
    ],
  ]);
});

test("only Premium members can export: everyone else is turned away on the server", async () => {
  const t = newTest();
  const free = await person(t, "free@example.com");
  const newcomer = await person(t, "new@example.com", { setUp: false });
  await addAll(free, [{ type: "coin", title: "Krone" }]);

  await expect(
    t.query(api.collection.exports.csv, { view: {} }),
  ).rejects.toThrow("NOT_SIGNED_IN");
  await expect(
    newcomer.as.query(api.collection.exports.csv, { view: {} }),
  ).rejects.toThrow("NOT_SET_UP");
  await expect(
    free.as.query(api.collection.exports.csv, { view: {} }),
  ).rejects.toThrow("PREMIUM_REQUIRED");

  await subscribe(t, free.userId);
  expect(await exported(free)).toHaveLength(2);
});

test("text holding commas, quotes or line breaks is quoted as RFC 4180 has it, and lines end in CRLF", async () => {
  const t = newTest();
  const ada = await premiumMember(t, "ada@example.com");
  await addAll(ada, [
    {
      type: "banknote",
      title: 'The "Viking" note, 1st issue',
      denomination: "100 kroner",
      source: "Grandad's drawer\nOslo, 1990",
    },
  ]);

  const csv = await ada.as.query(api.collection.exports.csv, { view: {} });
  const lines = csv.slice(1).split("\r\n");
  expect(lines[2]).toBe("");
  expect(lines[1]).toBe(
    'Banknote,"The ""Viking"" note, 1st issue",,100 kroner,,,,,,1,,,NOK,,"Grandad\'s drawer\nOslo, 1990",,,',
  );
  expect((await exported(ada))[1]).toEqual([
    "Banknote",
    'The "Viking" note, 1st issue',
    "",
    "100 kroner",
    "",
    "",
    "",
    "",
    "",
    "1",
    "",
    "",
    "NOK",
    "",
    "Grandad's drawer\nOslo, 1990",
    "",
    "",
    "",
  ]);
});

test("the export covers exactly the Collection view: its search, filters and sort, and only the person's own Items", async () => {
  const t = newTest();
  const ada = await premiumMember(t, "ada@example.com");
  const bob = await premiumMember(t, "bob@example.com");
  await addAll(ada, [
    { type: "coin", title: "Krone 1908", country: "NO", year: 1908 },
    { type: "coin", title: "Krone 1875", country: "NO", year: 1875 },
    {
      type: "coin",
      title: "Krone 1950",
      country: "NO",
      year: 1950,
      purchasePrice: 5000,
    },
    { type: "banknote", title: "Krone note", country: "NO", year: 1901 },
    { type: "coin", title: "Dollar", country: "US", year: 1881 },
  ]);
  await addAll(bob, [{ type: "coin", title: "Krone 1910", country: "NO" }]);
  const titles = async (
    view: ExportArgs["view"],
    options: Omit<ExportArgs, "view"> = {},
  ) => (await exported(ada, view, options)).slice(1).map((row) => row[1]);

  expect(await titles({})).toEqual([
    "Krone 1875",
    "Dollar",
    "Krone note",
    "Krone 1908",
    "Krone 1950",
  ]);
  expect(await titles({ search: "krone", type: "coin" })).toEqual([
    "Krone 1875",
    "Krone 1908",
    "Krone 1950",
  ]);
  expect(
    await titles({ search: "krone", type: "coin", sort: "price" }),
  ).toEqual(["Krone 1950", "Krone 1875", "Krone 1908"]);
  expect(await titles({ country: "US" })).toEqual(["Dollar"]);
  // Country names are searched in the language asked for.
  expect(await titles({ search: "norge" }, { locale: "nb" })).toEqual([
    "Krone 1875",
    "Krone note",
    "Krone 1908",
    "Krone 1950",
  ]);
  expect(await titles({ search: "nothing like it" })).toEqual([]);
});

test("Items in one Album, or in none, are exported alone when the view is narrowed to them", async () => {
  const t = newTest();
  const ada = await premiumMember(t, "ada@example.com");
  const albumId = await ada.as.mutation(api.albums.create, {
    name: "Travel",
    colour: "teal",
  });
  await addAll(ada, [
    { type: "coin", title: "In the Album", albumId },
    { type: "coin", title: "Loose" },
  ]);
  const titles = async (album: string) =>
    (await exported(ada, { album })).slice(1).map((row) => row[1]);

  expect(await titles(albumId)).toEqual(["In the Album"]);
  expect(await titles("none")).toEqual(["Loose"]);
});

test("headings and names are in the person's language, or the one asked for; numbers and dates stay plain", async () => {
  const t = newTest();
  const kari = await premiumMember(t, "kari@example.com", { language: "nb" });
  await addAll(kari, [
    {
      type: "coin",
      title: "1 krone 1908",
      year: 1908,
      denomination: "1 krone",
      gradingScale: "norwegian",
      grade: "1-",
      strike: "circulation",
      material: "silver",
      materialNote: "0.800",
      country: "NO",
      quantity: 3,
      purchasePrice: 123456789,
      purchaseDate: "2023-11-30",
    },
    {
      type: "stamp",
      title: "Posthorn",
      gradingScale: "stamp",
      grade: "mnh",
      country: "SE",
    },
  ]);

  expect(await exported(kari)).toEqual([
    [
      "Objekttype",
      "Tittel",
      "År",
      "Pålydende",
      "Kvalitet",
      "Kvalitetsskala",
      "Preging",
      "Materiale",
      "Land",
      "Antall",
      "Innkjøpspris",
      "Markedsverdi",
      "Valuta",
      "Innkjøpsdato",
      "Kilde",
      "Solgt den",
      "Salgspris",
      "Salgsnotat",
    ],
    [
      "Mynt",
      "1 krone 1908",
      "1908",
      "1 krone",
      "1−",
      "Norsk (0–3)",
      "Omløp",
      "Sølv · 0.800",
      "Norge",
      "3",
      "1234567.89",
      "",
      "NOK",
      "2023-11-30",
      "",
      "",
      "",
      "",
    ],
    [
      "Frimerke",
      "Posthorn",
      "",
      "",
      "Postfrisk",
      "Kvalitet (frimerker)",
      "",
      "",
      "Sverige",
      "1",
      "",
      "",
      "NOK",
      "",
      "",
      "",
      "",
      "",
    ],
  ]);

  const [header, coin] = await exported(kari, {}, { locale: "de" });
  expect(header?.slice(0, 5)).toEqual([
    "Objektart",
    "Titel",
    "Jahr",
    "Nennwert",
    "Erhaltung",
  ]);
  expect(coin?.slice(0, 9)).toEqual([
    "Münze",
    "1 krone 1908",
    "1908",
    "1 krone",
    "1−",
    "Norwegisch (0–3)",
    "Umlauf",
    "Silber · 0.800",
    "Norwegen",
  ]);
});

/** A Collection of `count` coins for `ownerId`, put straight into the database. */
async function fillCollection(t: Test, ownerId: Id<"users">, count: number) {
  await t.run(async (ctx) => {
    for (let index = 0; index < count; index++)
      await ctx.db.insert("items", {
        ownerId,
        type: "coin",
        title: `Coin ${index}`,
        quantity: 1,
      });
  });
}

test("a Collection too large to read whole isn't exported, rather than exported in part", async () => {
  // Convex caps what one query may read; this deployment's cap is lowered so
  // a modest Collection runs into it.
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { documentsRead: 700 },
  });
  rateLimiter.register(t);
  const ada = await premiumMember(t, "ada@example.com");
  await fillCollection(t, ada.userId, 1000);

  await expect(
    ada.as.query(api.collection.exports.csv, { view: {} }),
  ).rejects.toThrow("COLLECTION_TOO_LARGE_TO_EXPORT");
});

test("the sold view's export fills the sold-on date, sale price and sale note; owned Items leave them empty", async () => {
  const t = newTest();
  const ada = await premiumMember(t, "ada@example.com");
  const [kept, sold] = await addAll(ada, [
    { type: "coin", title: "Kept krone" },
    { type: "coin", title: "Sold krone", purchasePrice: 10000 },
  ]);
  await ada.as.mutation(api.items.sell, {
    itemId: sold!,
    soldOn: "2026-10-01",
    salePrice: 125050,
    saleNote: "Oslo coin fair",
  });

  const [header, row] = await exported(ada, { status: "sold" });
  expect(header?.slice(-3)).toEqual(["Sold on", "Sale price", "Sale note"]);
  expect(row?.[1]).toBe("Sold krone");
  expect(row?.slice(-3)).toEqual(["2026-10-01", "1250.50", "Oslo coin fair"]);
  const [, owned] = await exported(ada);
  expect(owned?.[1]).toBe("Kept krone");
  expect(owned?.slice(-3)).toEqual(["", "", ""]);
  expect(kept).toBeDefined();
});
