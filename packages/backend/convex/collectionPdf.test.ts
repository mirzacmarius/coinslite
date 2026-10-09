/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { getDocumentProxy } from "unpdf";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { formatCsvRecord } from "./catalog/csvText";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Test = ReturnType<typeof convexTest>;

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

/** A person who has finished signing up, signed in; Premium unless told otherwise. */
async function person(
  t: Test,
  email: string,
  extra: { setUp?: boolean; premium?: boolean } = {},
) {
  const userId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      ...(extra.setUp !== false && {
        termsAcceptedAt: Date.now(),
        homeCurrency: "NOK" as const,
      }),
    });
    if (extra.premium !== false) {
      await ctx.db.insert("subscriptions", {
        userId,
        polarId: `sub_${email}`,
        polarCustomerId: `cus_${email}`,
        productId: "prod_premium_monthly",
        status: "active",
        interval: "month",
        currency: "NOK",
        amount: 3900,
        cancelAtPeriodEnd: false,
        modifiedAt: Date.now(),
        premium: true,
      });
    }
    return userId;
  });
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Person = Awaited<ReturnType<typeof person>>;
type ItemArgs = FunctionArgs<typeof api.items.add>;
type DownloadArgs = FunctionArgs<typeof api.collectionPdf.download>;

const add = (who: Person, item: ItemArgs) =>
  who.as.mutation(api.items.add, item);

afterEach(() => {
  vi.useRealTimers();
});

/** 3 × 150 kr paid, 3 × 200 kr now: a gain of 150 kr. */
const kroner: ItemArgs = {
  type: "coin",
  title: "2 kroner 1914",
  year: 1914,
  denomination: "2 kroner",
  gradingScale: "norwegian",
  grade: "1+",
  quantity: 3,
  purchasePrice: 150_00,
  marketValue: 200_00,
  purchaseDate: "2024-03-05",
};
/** 2 × 5 000 kr paid, 2 × 4 500 kr now: a loss of 1 000 kr. */
const goldCoin: ItemArgs = {
  type: "coin",
  title: "20 kroner 1910",
  year: 1910,
  denomination: "20 kroner",
  quantity: 2,
  purchasePrice: 5_000_00,
  marketValue: 4_500_00,
};
/** A gift: a Market value, no Purchase price, so no Gain/loss. */
const stamp: ItemArgs = {
  type: "stamp",
  title: "Posthorn 1 øre",
  gradingScale: "stamp",
  grade: "mnh",
  marketValue: 50_00,
};

/**
 * A PDF's text, page by page, in the order it was set: each table row reads
 * cell after cell, and text wrapped over several lines reads as one.
 */
async function pdfText(pdf: ArrayBuffer) {
  const document = await getDocumentProxy(new Uint8Array(pdf));
  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number++) {
    const content = await (await document.getPage(number)).getTextContent();
    pages.push(
      content.items
        .flatMap((item) => ("str" in item && item.str.trim() ? [item.str] : []))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return { pages, all: pages.join(" ") };
}

/** Downloads the Collection PDF as someone, at 14:30 on 9 October 2026 in Oslo. */
async function download(who: Person, args: Partial<DownloadArgs> = {}) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 9, 9, 12, 30));
  const file = await who.as.action(api.collectionPdf.download, {
    view: {},
    locale: "en",
    timeZone: "Europe/Oslo",
    ...args,
  });
  return { fileName: file.fileName, ...(await pdfText(file.pdf)) };
}

test("the PDF has a header with the scope, generation time, owner and totals, one row per Item, a totals row and page numbers", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run((ctx) => ctx.db.patch(ada.userId, { fullName: "Ada Lovelace" }));
  await add(ada, kroner);
  await add(ada, goldCoin);
  await add(ada, stamp);

  const pdf = await download(ada);

  expect(pdf.fileName).toBe("coinslite-collection-2026-10-09.pdf");
  expect(pdf.pages).toHaveLength(1);
  const text = pdf.all;
  expect(text).toContain("Collection");
  expect(text).toContain("Generated Oct 9, 2026, 2:30 PM");
  expect(text).toContain("Scope Whole Collection");
  expect(text).toContain("Sorted by Year, oldest first");
  expect(text).toContain("Currency NOK");
  expect(text).toContain("Name Ada Lovelace");
  expect(text).toContain("Email ada@example.com");
  // 3 × 150 kr + 2 × 5 000 kr paid; 3 × 200 kr + 2 × 4 500 kr + 50 kr now;
  // Gain/loss over the two Items with both: +150 kr − 1 000 kr.
  expect(text).toContain(
    "Totals Items 3 Pieces 6 Purchase price NOK 10,450.00 Market value NOK 9,650.00 Gain/loss -NOK 850.00",
  );
  expect(text).toContain(
    "Item type Title Year Denomination Grade Quantity Purchase date Purchase price Market value Gain/loss",
  );
  // In the view's order: by year, oldest first, Items without one last.
  expect(text).toContain(
    "Coin 20 kroner 1910 1910 20 kroner 2 NOK 10,000.00 NOK 9,000.00 -NOK 1,000.00 " +
      "Coin 2 kroner 1914 1914 2 kroner 1+ 3 Mar 5, 2024 NOK 450.00 NOK 600.00 +NOK 150.00 " +
      "Stamp Posthorn 1 øre Mint never hinged 1 NOK 50.00 " +
      "Total 6 NOK 10,450.00 NOK 9,650.00 -NOK 850.00",
  );
  expect(text).toContain("Page 1 of 1");
  expect(text).toContain(
    "Amounts are in NOK and cover all of an Item's pieces: the amount per piece × Quantity.",
  );
  expect(text).toContain(
    "Gain/loss is Market value minus Purchase price, for Items that have both.",
  );
});

test("the PDF covers exactly the view on screen: its search, filters and sort, named in the header, with totals over the view", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run((ctx) => ctx.db.patch(ada.userId, { country: "NO" }));
  const travel = await ada.as.mutation(api.albums.create, { name: "Travel" });
  await add(ada, { ...kroner, country: "NO", albumId: travel });
  await add(ada, { ...goldCoin, country: "NO", bullion: true });
  await add(ada, {
    type: "coin",
    title: "Morgan dollar 1881",
    year: 1881,
    country: "US",
    purchasePrice: 1_000_00,
    marketValue: 1_500_00,
  });
  await add(ada, stamp);

  // Searched and filtered, sorted by the highest Purchase price.
  const searched = await download(ada, {
    view: { search: "kroner", type: "coin", sort: "price" },
  });
  expect(searched.all).toContain(
    "Scope Search: “kroner” Item type: Coin Sorted by Highest Purchase price",
  );
  expect(searched.all).toContain(
    "Totals Items 2 Pieces 5 Purchase price NOK 10,450.00 Market value NOK 9,600.00 Gain/loss -NOK 850.00",
  );
  expect(searched.all).toContain(
    "Coin 20 kroner 1910 1910 20 kroner 2 NOK 10,000.00 NOK 9,000.00 -NOK 1,000.00 " +
      "Coin 2 kroner 1914 1914 2 kroner 1+ 3 Mar 5, 2024 NOK 450.00 NOK 600.00 +NOK 150.00 " +
      "Total 5 NOK 10,450.00 NOK 9,600.00 -NOK 850.00",
  );
  expect(searched.all).not.toContain("Morgan");
  expect(searched.all).not.toContain("Posthorn");

  // Every other filter, each named as the Collection page names it.
  const narrowed = await download(ada, {
    view: {
      origin: "own",
      country: "no",
      denomination: "2 KRONER",
      grade: { gradingScale: "norwegian", grade: "1+" },
      album: travel,
    },
  });
  expect(narrowed.all).toContain(
    "Scope Origin: Domestic (Norway) Country: Norway Denomination: 2 KRONER Grade: 1+ Album: Travel Sorted by Year, oldest first",
  );
  expect(narrowed.all).toContain("Totals Items 1 Pieces 3");
  expect(narrowed.all).toContain("Coin 2 kroner 1914");
  expect(narrowed.all).not.toContain("20 kroner 1910");

  const bullion = await download(ada, {
    view: { bullionOnly: true, album: "none", origin: "foreign" },
  });
  expect(bullion.all).toContain(
    "Scope Item type: Bullion coins Origin: Foreign Album: Without an Album",
  );
  expect(bullion.all).toContain("Totals Items 0 Pieces 0");
  expect(bullion.all).not.toContain("kroner 19");
});

test("the PDF covers only the person's own Items and Albums", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const bea = await person(t, "bea@example.com");
  await add(ada, kroner);
  const beasAlbum = await bea.as.mutation(api.albums.create, {
    name: "Bea's best",
  });
  await add(bea, { ...goldCoin, albumId: beasAlbum });

  expect((await download(ada)).all).not.toContain("20 kroner 1910");
  const someoneElses = await download(ada, { view: { album: beasAlbum } });
  expect(someoneElses.all).toContain("Album: Unknown Album");
  expect(someoneElses.all).not.toContain("Bea's best");
  expect(someoneElses.all).toContain("Totals Items 0");
});

test("the PDF is in the language asked for, else the person's own, every character included", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run((ctx) =>
    ctx.db.patch(ada.userId, { language: "de", fullName: "Åse Ødegård" }),
  );
  await add(ada, { ...kroner, title: "Ducat Ștefan cel Mare" });
  await add(ada, goldCoin);
  await add(ada, stamp);

  const norwegian = await download(ada, {
    locale: "nb",
    view: { search: "kroner" },
  });
  expect(norwegian.fileName).toBe("coinslite-samling-2026-10-09.pdf");
  const text = norwegian.all;
  expect(text).toContain("Samling Laget 9. okt. 2026, 14:30");
  expect(text).toContain("Omfang Søk: «kroner» Sortert etter År, eldste først");
  expect(text).toContain("Navn Åse Ødegård");
  expect(text).toContain(
    "Objekttype Tittel År Pålydende Kvalitet Antall Innkjøpsdato Innkjøpspris Markedsverdi Gevinst/tap",
  );
  expect(text).toContain(
    "Mynt 20 kroner 1910 1910 20 kroner 2 10 000,00 kr 9 000,00 kr −1 000,00 kr",
  );
  expect(text).toContain(
    "Mynt Ducat Ștefan cel Mare 1914 2 kroner 1+ 3 5. mars 2024 450,00 kr 600,00 kr +150,00 kr",
  );
  expect(text).toContain("Totalt 5 10 450,00 kr 9 600,00 kr −850,00 kr");
  expect(text).toContain("Side 1 av 1");

  const own = await download(ada, { locale: undefined });
  expect(own.fileName).toBe("coinslite-sammlung-2026-10-09.pdf");
  expect(own.all).toContain("Briefmarke Posthorn 1 øre Postfrisch 1");
  expect(own.all).toContain("Seite 1 von 1");
});

test("a long view runs over several pages, each with the column headings and a page number, and the totals at the end", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 1; n <= 90; n++) {
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "banknote",
        title: `Seddel ${n}`,
        year: 1900 + n,
        quantity: 1,
        purchasePrice: 80_00,
        marketValue: 100_00,
      });
    }
  });

  const pdf = await download(ada);

  expect(pdf.pages.length).toBeGreaterThan(1);
  pdf.pages.forEach((page, index) => {
    if (page.includes("Seddel"))
      expect(page).toContain(
        "Item type Title Year Denomination Grade Quantity Purchase date Purchase price Market value Gain/loss",
      );
    expect(page).toContain(`Page ${index + 1} of ${pdf.pages.length}`);
  });
  for (let n = 1; n <= 90; n++) {
    expect(pdf.all).toContain(
      `Banknote Seddel ${n} ${1900 + n} 1 NOK 80.00 NOK 100.00 +NOK 20.00`,
    );
  }
  const totals = "Total 90 NOK 7,200.00 NOK 9,000.00 +NOK 1,800.00";
  expect(pdf.all).toContain(totals);
  expect(pdf.all.indexOf(totals)).toBeGreaterThan(
    pdf.all.indexOf("Seddel 90 "),
  );
});

test("the PDF is made for Premium members only, on the server", async () => {
  const t = newTest();
  const free = await person(t, "free@example.com", { premium: false });
  const notSetUp = await person(t, "new@example.com", { setUp: false });
  await add(free, kroner);
  const args = { view: {}, locale: "en" as const };

  await expect(
    free.as.action(api.collectionPdf.download, args),
  ).rejects.toThrow("PREMIUM_REQUIRED");
  await expect(t.action(api.collectionPdf.download, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    notSetUp.as.action(api.collectionPdf.download, args),
  ).rejects.toThrow("NOT_SET_UP");
});

test("a PDF lists up to 5 000 Items; a larger view is turned away rather than cut short", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const fill = (count: number, type: "coin" | "stamp") =>
    t.run(async (ctx) => {
      for (let n = 0; n < count; n++) {
        await ctx.db.insert("items", {
          ownerId: ada.userId,
          type,
          title: `${type} ${n}`,
          quantity: 1,
        });
      }
    });
  await fill(5_000, "coin");
  await fill(1, "stamp");

  await expect(
    ada.as.action(api.collectionPdf.download, { view: {} }),
  ).rejects.toThrow("TOO_MANY_ITEMS_FOR_PDF");
  // Narrowed to 5 000, the view fits.
  const coins = await ada.as.action(api.collectionPdf.download, {
    view: { type: "coin" },
    locale: "en",
  });
  const { all } = await pdfText(coins.pdf);
  expect(all).toContain("Total 5,000");
}, 60_000);

test("an Item added from the Catalog shows its Catalog entry's facts in the PDF", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const admin = await t.run((ctx) =>
    ctx.db.insert("users", { email: "admin@example.com", role: "admin" }),
  );
  // A Catalog with a country and, under it, a Morgan dollar with its facts.
  const csv = [
    [
      "id",
      "parent_id",
      "title",
      "item_type",
      "is_addable",
      "country",
      "denomination",
      "year_from",
      "facts_source",
    ],
    ["us", "", "United States", "", "", "US", "", "", ""],
    [
      "us-morgan-1881-cc",
      "us",
      "Morgan dollar 1881-CC",
      "coin",
      "true",
      "US",
      "1 dollar",
      "1881",
      "United States Mint",
    ],
  ]
    .map((row) => formatCsvRecord(row))
    .join("");
  const report = await t
    .withIdentity({ subject: `${admin}|session` })
    .mutation(api.catalog.csv.importFile, { csv });
  expect(report.errors).toEqual([]);
  await add(ada, {
    type: "coin",
    title: "Morgan dollar 1881-CC",
    catalogEntryKey: "us-morgan-1881-cc",
    quantity: 2,
  });

  const { all } = await download(ada, { view: { country: "US" } });

  expect(all).toContain("Country: United States");
  expect(all).toContain("Coin Morgan dollar 1881-CC 1881 1 dollar 2");
});

test("a Collection too large to read whole isn't made into a PDF, rather than one that leaves Items out", async () => {
  const t = convexTest({
    schema,
    modules,
    transactionLimits: { documentsRead: 700 },
  });
  rateLimiter.register(t);
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 0; n < 1000; n++)
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "coin",
        title: `Coin ${n}`,
        quantity: 1,
      });
  });

  await expect(
    ada.as.action(api.collectionPdf.download, { view: {} }),
  ).rejects.toThrow("COLLECTION_TOO_LARGE_TO_EXPORT");
});
