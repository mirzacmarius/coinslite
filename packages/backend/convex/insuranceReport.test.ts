/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { getDocumentProxy } from "unpdf";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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
type Scope = FunctionArgs<typeof api.insuranceReport.preview>["scope"];
type Columns = FunctionArgs<typeof api.insuranceReport.preview>["columns"];
type ItemArgs = FunctionArgs<typeof api.items.add>;

/**
 * Stores Spot prices as the scheduled refresh does: gold at 2400 dollars a
 * troy ounce and 10 kroner to the dollar, so a troy ounce of gold is 24 000 kr.
 */
const storeSpotPrices = (t: Test) =>
  t.mutation(internal.spotPrices.record, {
    quotedAt: Date.UTC(2026, 9, 9, 12, 0),
    perDollar: {
      XAU: 1 / 2400,
      XAG: 1 / 30,
      NOK: 10,
      SEK: 10.5,
      DKK: 6,
      EUR: 0.8,
      RON: 4,
      GBP: 0.75,
      USD: 1,
      CHF: 0.9,
    },
  });

const kroner: ItemArgs = {
  type: "coin",
  title: "2 kroner 1914",
  year: 1914,
  denomination: "2 kroner",
  quantity: 3,
  purchasePrice: 150_00,
  marketValue: 200_00,
};
/** 9 g of fine gold a piece: 2 × 9 g × 24 000 kr / 31.1034768 g = 13 889.12 kr of gold. */
const goldCoin: ItemArgs = {
  type: "coin",
  title: "20 kroner 1910 gold",
  year: 1910,
  metal: "gold",
  weight: 10,
  purity: 0.9,
  quantity: 2,
  purchasePrice: 5_000_00,
  marketValue: 6_000_00,
};
const stamp: ItemArgs = { type: "stamp", title: "Posthorn 1 øre" };

/** A preview that has something to show. */
function ready<P extends { status: string }>(preview: P) {
  expect(preview.status).toBe("ready");
  return preview as Extract<P, { status: "ready" }>;
}

const add = (who: Person, item: ItemArgs) =>
  who.as.mutation(api.items.add, item);

afterEach(() => {
  vi.useRealTimers();
});

/** Fills in the contact details the Account screen keeps. */
const giveContactDetails = (t: Test, who: Person) =>
  t.run((ctx) =>
    ctx.db.patch(who.userId, {
      displayName: "Ada",
      fullName: "Ada Lovelace",
      contactPhone: "+47 22 12 34 56",
      streetAddress: "Storgata 1",
      postalCode: "0155",
      city: "Oslo",
      country: "NO",
    }),
  );

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

/** Downloads the report as someone, at 14:30 on 9 October 2026 in Oslo. */
async function download(
  who: Person,
  args: Partial<FunctionArgs<typeof api.insuranceReportPdf.download>> = {},
) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 9, 9, 12, 30));
  const file = await who.as.action(api.insuranceReportPdf.download, {
    scope: collection,
    columns: [...defaultColumns],
    language: "en",
    timeZone: "Europe/Oslo",
    ...args,
  });
  return { fileName: file.fileName, ...(await pdfText(file.pdf)) };
}

const collection = { kind: "collection" } as const;
const defaultColumns = ["marketValue", "metalValue", "insuredValue"] as const;

test("the preview counts pieces and Items and totals each chosen value over the whole Collection", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await add(ada, kroner);
  await add(ada, goldCoin);
  await add(ada, stamp);

  const preview = await ada.as.query(api.insuranceReport.preview, {
    scope: collection,
    columns: [...defaultColumns],
  });

  expect(preview).toMatchObject({
    status: "ready",
    items: 3,
    pieces: 6,
    currency: "NOK",
    totals: {
      // 3 × 200 kr + 2 × 6 000 kr
      marketValue: 12_600_00,
      metalValue: 13_889_12,
      // the kroner at their Market value, the gold coins at their Metal value
      insuredValue: 600_00 + 13_889_12,
    },
  });
  expect(ready(preview).totals).not.toHaveProperty("purchasePrice");
});

test("the scope is the whole Collection, chosen Albums, Items without an Album, or Albums and Items without one", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, { name: "Travel" });
  const gold = await ada.as.mutation(api.albums.create, { name: "Gold" });
  await ada.as.mutation(api.albums.create, { name: "Empty" });
  await add(ada, { ...kroner, quantity: 1, albumId: travel });
  await add(ada, { ...kroner, quantity: 2, albumId: travel });
  await add(ada, { ...goldCoin, quantity: 4, albumId: gold });
  await add(ada, { ...stamp, quantity: 8 });
  const piecesIn = async (scope: Scope) => {
    const { items, pieces } = ready(
      await ada.as.query(api.insuranceReport.preview, {
        scope,
        columns: ["marketValue"],
      }),
    );
    return { items, pieces };
  };
  const albums = (albumIds: Id<"albums">[], withoutAlbum = false) =>
    ({ kind: "albums", albumIds, withoutAlbum }) as const;

  expect(await piecesIn(collection)).toEqual({ items: 4, pieces: 15 });
  expect(await piecesIn(albums([travel]))).toEqual({ items: 2, pieces: 3 });
  expect(await piecesIn(albums([travel, gold]))).toEqual({
    items: 3,
    pieces: 7,
  });
  expect(await piecesIn(albums([], true))).toEqual({ items: 1, pieces: 8 });
  expect(await piecesIn(albums([gold], true))).toEqual({
    items: 2,
    pieces: 12,
  });
  // An Album chosen twice still counts once.
  expect(await piecesIn(albums([gold, gold]))).toEqual({ items: 1, pieces: 4 });
});

test("a scope of Albums must choose something, and only the person's own Albums", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const grace = await person(t, "grace@example.com");
  const graces = await grace.as.mutation(api.albums.create, { name: "Mine" });
  await add(grace, { ...kroner, albumId: graces });

  await expect(
    ada.as.query(api.insuranceReport.preview, {
      scope: { kind: "albums", albumIds: [], withoutAlbum: false },
      columns: ["marketValue"],
    }),
  ).rejects.toThrow("SCOPE_REQUIRED");
  await expect(
    ada.as.query(api.insuranceReport.preview, {
      scope: { kind: "albums", albumIds: [graces], withoutAlbum: false },
      columns: ["marketValue"],
    }),
  ).rejects.toThrow("ALBUM_NOT_FOUND");
});

test("only Premium members get a preview: the Free plan, the signed out and the not set up are turned away", async () => {
  const t = newTest();
  const free = await person(t, "free@example.com", { premium: false });
  const newcomer = await person(t, "new@example.com", { setUp: false });
  const args = { scope: collection, columns: [...defaultColumns] };

  await expect(
    free.as.query(api.insuranceReport.preview, args),
  ).rejects.toThrow("PREMIUM_REQUIRED");
  await expect(t.query(api.insuranceReport.preview, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    newcomer.as.query(api.insuranceReport.preview, args),
  ).rejects.toThrow("NOT_SET_UP");
});

test("a report keeps at least one of Purchase price, Market value or Metal value", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada, kroner);
  const preview = (columns: Columns) =>
    ada.as.query(api.insuranceReport.preview, { scope: collection, columns });

  await expect(preview(["insuredValue"])).rejects.toThrow(
    "BASE_VALUE_REQUIRED",
  );
  await expect(preview([])).rejects.toThrow("BASE_VALUE_REQUIRED");
  expect(
    ready(await preview(["purchasePrice", "insuredValue"])).totals,
  ).toEqual({
    purchasePrice: 450_00,
    insuredValue: 450_00,
  });
});

test("a report covers only the person's own Items", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const grace = await person(t, "grace@example.com");
  await add(ada, kroner);
  await add(grace, goldCoin);
  await add(grace, stamp);

  const preview = await ada.as.query(api.insuranceReport.preview, {
    scope: { kind: "albums", albumIds: [], withoutAlbum: true },
    columns: ["marketValue"],
  });

  expect(preview).toMatchObject({
    items: 1,
    pieces: 3,
    totals: { marketValue: 600_00 },
  });
});

test("a report holds up to 5 000 Items; more are turned away rather than left out", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  const album = await ada.as.mutation(api.albums.create, { name: "Hoard" });
  const fill = (count: number, albumId?: Id<"albums">) =>
    t.run(async (ctx) => {
      for (let n = 0; n < count; n++) {
        await ctx.db.insert("items", {
          ownerId: ada.userId,
          type: "coin",
          title: `Krone ${n}`,
          quantity: 1,
          albumId,
        });
      }
    });
  await fill(4_000, album);
  await fill(1_000);
  const preview = (scope: Scope) =>
    ada.as.query(api.insuranceReport.preview, {
      scope,
      columns: ["marketValue"],
    });

  expect(await preview(collection)).toMatchObject({
    status: "ready",
    items: 5_000,
  });

  await fill(1);
  // The preview says so, for the report screen to explain; the PDF is refused.
  expect(await preview(collection)).toEqual({
    status: "tooLarge",
    limit: 5_000,
  });
  expect(
    await preview({ kind: "albums", albumIds: [album], withoutAlbum: true }),
  ).toEqual({ status: "tooLarge", limit: 5_000 });
  expect(
    await preview({ kind: "albums", albumIds: [album], withoutAlbum: false }),
  ).toMatchObject({ status: "ready", items: 4_000 });
  await expect(
    ada.as.action(api.insuranceReportPdf.download, {
      scope: collection,
      columns: ["marketValue"],
    }),
  ).rejects.toThrow("REPORT_TOO_LARGE");
});

test("before the first Spot prices, Metal values are missing and Insured values fall back on the other chosen values", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada, goldCoin);
  const preview = () =>
    ada.as.query(api.insuranceReport.preview, {
      scope: collection,
      columns: [...defaultColumns],
    });

  expect(await preview()).toMatchObject({
    spotPrices: null,
    totals: { marketValue: 12_000_00, metalValue: 0, insuredValue: 12_000_00 },
  });

  await storeSpotPrices(t);
  expect(await preview()).toMatchObject({
    spotPrices: { quotedAt: Date.UTC(2026, 9, 9, 12, 0), stale: false },
    totals: { metalValue: 13_889_12, insuredValue: 13_889_12 },
  });
});

test("the PDF has the report's header, the owner, the Spot prices used, a summary, one row per Item with a totals row, page numbers and a closing note", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await giveContactDetails(t, ada);
  await add(ada, kroner);
  await add(ada, goldCoin);
  await add(ada, stamp);

  const report = await download(ada);

  expect(report.fileName).toBe("insurance-report-2026-10-09.pdf");
  expect(report.pages).toHaveLength(1);
  const text = report.all;
  expect(text).toContain("Insurance report");
  // When, what and how much
  expect(text).toContain("Generated Oct 9, 2026, 2:30 PM");
  expect(text).toContain("Scope Whole Collection");
  expect(text).toContain("Items 3");
  expect(text).toContain("Pieces 6");
  expect(text).toContain("Currency NOK");
  // Who, from their Account
  expect(text).toContain("Name Ada Lovelace");
  expect(text).toContain("Email ada@example.com");
  expect(text).toContain("Phone +47 22 12 34 56");
  expect(text).toContain("Address Storgata 1 0155 Oslo Norway");
  // The Spot prices behind the Metal values: 2400 and 30 dollars a troy ounce at 10 kroner
  expect(text).toContain("Gold kr 771.62 per gram kr 24,000.00 per troy ounce");
  expect(text).toContain("Silver kr 9.65 per gram kr 300.00 per troy ounce");
  expect(text).toContain("As of Oct 9, 2026, 2:00 PM");
  // The totals, then the table
  expect(text).toContain(
    "Summary Market value kr 12,600.00 Metal value kr 13,889.12 Insured value kr 14,489.12",
  );
  expect(text).toContain(
    "Type Title Year Denomination Grade Quantity Market value Metal value Insured value",
  );
  expect(text).toContain(
    "Coin 2 kroner 1914 1914 2 kroner 3 kr 600.00 kr 600.00",
  );
  expect(text).toContain(
    "Coin 20 kroner 1910 gold 1910 2 kr 12,000.00 kr 13,889.12 kr 13,889.12",
  );
  expect(text).toContain("Stamp Posthorn 1 øre 1");
  expect(text).toContain("Total 6 kr 12,600.00 kr 13,889.12 kr 14,489.12");
  // Purchase prices weren't chosen: 3 × 150 kr appears nowhere.
  expect(text).not.toContain("kr 450.00");
  expect(text).toContain("Page 1 of 1");
  expect(text).toContain(
    "About these values Amounts are in NOK and cover all of an Item's pieces: the amount per piece × Quantity.",
  );
  expect(text).toContain(
    "Purchase prices and Market values are stated by the owner, not appraised.",
  );
  expect(text).toContain(
    "Metal value is weight × purity × Spot price × Quantity, at the Spot prices above",
  );
  expect(text).toContain(
    "Insured value is the highest of the chosen values for each Item.",
  );
});

test("the PDF is in the language asked for, every character included", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  await giveContactDetails(t, ada);
  await add(ada, {
    ...goldCoin,
    title: "Ducat Ștefan cel Mare",
    gradingScale: "sheldon",
    grade: "65",
    strike: "proof",
  });
  await add(ada, { ...stamp, gradingScale: "stamp", grade: "mnh" });

  const report = await download(ada, { language: "ro" });

  expect(report.fileName).toBe("raport-asigurare-2026-10-09.pdf");
  const text = report.all;
  expect(text).toContain("Raport de asigurare");
  expect(text).toContain("Generat la 9 oct. 2026, 14:30");
  expect(text).toContain("Acoperire Toată colecția");
  expect(text).toContain("Adresă Storgata 1 0155 Oslo Norvegia");
  expect(text).toContain(
    "Tip Titlu An Valoare nominală Stare Cantitate Valoare de piață Valoarea metalului Valoare asigurată",
  );
  expect(text).toContain(
    "Monedă Ducat Ștefan cel Mare 1910 PF-65 2 12.000,00 kr 13.889,12 kr 13.889,12 kr",
  );
  expect(text).toContain("Timbru Posthorn 1 øre Neștampilat, fără șarnieră 1");
  expect(text).toContain("Total 3 12.000,00 kr 13.889,12 kr 13.889,12 kr");
  expect(text).toContain("Pagina 1 din 1");
  expect(text).toContain(
    "Valoarea asigurată este cea mai mare dintre valorile alese pentru fiecare obiect.",
  );
});

test("a long email address breaks before its @, not inside the domain", async () => {
  const t = newTest();
  const owners = [
    "firstname.lastname@company-domain.no",
    "qa-insurance-owner+release@example.com",
  ];
  for (const email of owners) {
    const owner = await person(t, email);
    await add(owner, kroner);

    const report = await download(owner, { columns: ["marketValue"] });

    expect(report.all).toContain(`Email ${email.replace("@", " @")}`);
  }
});

test("a long report runs over several pages, each with the column headings and a page number, and totals at the end", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await t.run(async (ctx) => {
    for (let n = 1; n <= 90; n++) {
      await ctx.db.insert("items", {
        ownerId: ada.userId,
        type: "banknote",
        title: `Seddel ${n}`,
        quantity: 1,
        marketValue: 100_00,
      });
    }
  });

  const report = await download(ada, { columns: ["marketValue"] });

  expect(report.pages.length).toBeGreaterThan(1);
  report.pages.forEach((page, index) => {
    expect(page).toContain(
      "Type Title Year Denomination Grade Quantity Market value",
    );
    expect(page).toContain(`Page ${index + 1} of ${report.pages.length}`);
  });
  for (let n = 1; n <= 90; n++) {
    expect(report.all).toContain(`Banknote Seddel ${n} 1 kr 100.00`);
  }
  expect(report.pages.at(-1)).toContain("Total 90 kr 9,000.00");
  // Sorted the way people read numbers: Seddel 2 comes before Seddel 10.
  expect(report.all.indexOf("Seddel 2 ")).toBeLessThan(
    report.all.indexOf("Seddel 10 "),
  );
});

test("the PDF names the chosen Albums, shows only the chosen values, and leaves out Spot prices it didn't use", async () => {
  const t = newTest();
  await storeSpotPrices(t);
  const ada = await person(t, "ada@example.com");
  const travel = await ada.as.mutation(api.albums.create, { name: "Travel" });
  const gold = await ada.as.mutation(api.albums.create, { name: "Gold" });
  await add(ada, { ...kroner, albumId: travel });
  await add(ada, { ...goldCoin, albumId: gold });
  await add(ada, stamp);

  const report = await download(ada, {
    scope: { kind: "albums", albumIds: [travel, gold], withoutAlbum: true },
    columns: ["purchasePrice", "marketValue"],
  });

  const text = report.all;
  expect(text).toContain("Scope Albums: Travel, Gold Items without an Album");
  expect(text).toContain(
    "Type Title Year Denomination Grade Quantity Purchase price Market value Coin 2 kroner",
  );
  expect(text).toContain(
    "Coin 2 kroner 1914 1914 2 kroner 3 kr 450.00 kr 600.00",
  );
  expect(text).toContain("Total 6 kr 10,450.00 kr 12,600.00");
  expect(text).not.toContain("Spot prices");
  expect(text).not.toContain("Metal value");
  expect(text).not.toContain("Insured value");
});

test("before the first Spot prices, the PDF says so", async () => {
  const t = newTest();
  const ada = await person(t, "ada@example.com");
  await add(ada, goldCoin);

  const { all } = await download(ada);

  expect(all).toContain(
    "Spot prices No Spot prices yet, so no Item has a Metal value.",
  );
  expect(all).toContain("Total 2 kr 12,000.00 kr 0.00 kr 12,000.00");
});

test("the PDF is made for Premium members only, on the server", async () => {
  const t = newTest();
  const free = await person(t, "free@example.com", { premium: false });
  const args = {
    scope: collection,
    columns: [...defaultColumns],
    language: "en" as const,
  };

  await expect(
    free.as.action(api.insuranceReportPdf.download, args),
  ).rejects.toThrow("PREMIUM_REQUIRED");
  await expect(t.action(api.insuranceReportPdf.download, args)).rejects.toThrow(
    "NOT_SIGNED_IN",
  );
  await expect(
    free.as.action(api.insuranceReportPdf.download, {
      ...args,
      columns: ["insuredValue"],
    }),
  ).rejects.toThrow("PREMIUM_REQUIRED");
});
