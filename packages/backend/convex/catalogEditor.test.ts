/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { EditorValues } from "./catalog/fields";
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

/** A coin Catalog entry's values, its facts credited to a source. */
const coinValues = (title: string, extra: Partial<EditorValues> = {}) => ({
  title,
  sortOrder: 0,
  itemType: "coin" as const,
  factsSource: "Norges Bank",
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
    technicalDetails: "Hole in the middle.",
    historicalNotes: "Struck at Kongsberg.",
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

  // Saved again without its series and notes: those are cleared.
  const { series, historicalNotes, technicalDetails, ...kept } = edited;
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
