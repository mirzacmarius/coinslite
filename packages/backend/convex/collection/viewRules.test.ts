import { describe, expect, test } from "bun:test";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type SlimEntry,
  entryFacts,
  slimEntryOf,
  withCatalogFacts,
} from "../items/catalogFacts";
import { type CollectionView, withoutStorage } from "./view";
import { type ViewContext, countFilterOptions, itemsInView } from "./viewRules";

/** Catalog entries as stored, notes and all. */
const longNotes = "Struck in 1881 at the San Francisco Mint. ".repeat(500);
const entries = {
  morgan1881: {
    key: "us-morgan-dollar-1881-s",
    kind: "entry" as const,
    title: "Morgan dollar 1881-S",
    itemType: "coin" as const,
    country: "US",
    denomination: "1 dollar",
    series: "Morgan dollar",
    yearFrom: 1881,
    metal: "silver" as const,
    weight: 26.73,
    fineness: 0.9,
    historicalNotes: longNotes,
    technicalDetails: longNotes,
  },
  peace1922: {
    key: "us-peace-dollar-1922",
    kind: "entry" as const,
    title: "Peace dollar 1922",
    country: "US",
    denomination: "1 dollar",
    series: "Peace dollar",
    yearFrom: 1922,
    historicalNotes: longNotes,
  },
  ore1918: {
    key: "no-2-ore-1918",
    kind: "entry" as const,
    title: "2 øre 1918",
    country: "NO",
    denomination: "2 øre",
    yearFrom: 1918,
    material: "iron" as const,
  },
};
type EntryName = keyof typeof entries;

const owner = "owner" as Id<"users">;

/** An Item as stored: one linked to an entry holds none of its facts. */
function item(
  id: string,
  addedAt: number,
  fields: Partial<Doc<"items">> & { title: string },
  entry?: EntryName,
): Doc<"items"> & { entry?: EntryName } {
  return {
    _id: id as Id<"items">,
    _creationTime: addedAt,
    ownerId: owner,
    type: "coin",
    quantity: 1,
    ...fields,
    ...(entry && {
      catalogEntryId: entries[entry].key as Id<"catalogNodes">,
      entry,
    }),
  };
}

const collection = [
  item("peace", 1, { title: "Peace dollar 1922" }, "peace1922"),
  item("morgan", 2, { title: "Morgan dollar 1881-S" }, "morgan1881"),
  item("ore", 3, { title: "2 øre 1918" }, "ore1918"),
  item("token", 4, { title: "Mystery token", country: "SE", year: 1900 }),
];

/** The Collection as the list reads it: each Item with its entry's facts beneath its own. */
const resolvedFrom = (source: (name: EntryName) => SlimEntry) =>
  collection.map(({ entry, ...stored }) =>
    entry ? withCatalogFacts(stored, entryFacts(source(entry))) : stored,
  );
const fromWholeEntries = resolvedFrom((name) => entries[name]);
const fromSlimEntries = resolvedFrom((name) => {
  const slim = slimEntryOf(entries[name]);
  if (!slim) throw new Error(`${name} is an entry`);
  return slim;
});

const context: ViewContext = { ownCountry: "NO", entryId: null, locale: "en" };

/** The Items a view shows, by id, in its order, read both ways. */
function shown(view: CollectionView) {
  const ids = (items: Doc<"items">[]) =>
    itemsInView(items, view, context).map((each) => each._id as string);
  return { whole: ids(fromWholeEntries), slim: ids(fromSlimEntries) };
}

describe("the Items a view shows, from slim entries as from whole ones", () => {
  test("sorted by year, as the entries give it", () => {
    const expected = ["morgan", "token", "ore", "peace"];
    expect(shown({})).toEqual({ whole: expected, slim: expected });
  });

  test("searched by the entry's country, by name", () => {
    expect(shown({ search: "united states" })).toEqual({
      whole: ["morgan", "peace"],
      slim: ["morgan", "peace"],
    });
  });

  test("filtered by the entry's country", () => {
    expect(shown({ country: "us" })).toEqual({
      whole: ["morgan", "peace"],
      slim: ["morgan", "peace"],
    });
  });

  test("filtered by the entry's denomination, whatever its capitals and spacing", () => {
    expect(shown({ denomination: " 2  ØRE" })).toEqual({
      whole: ["ore"],
      slim: ["ore"],
    });
  });

  test("from abroad, against the person's own country", () => {
    expect(shown({ origin: "foreign" })).toEqual({
      whole: ["morgan", "token", "peace"],
      slim: ["morgan", "token", "peace"],
    });
  });
});

describe("how many Items each filter option would show, from slim entries as from whole ones", () => {
  const view: CollectionView = { country: "US" };
  const counted = (items: Doc<"items">[]) => {
    const { origins, countries, denominations } = countFilterOptions(
      items,
      view,
      context,
    );
    return { origins, countries, denominations };
  };
  const expected = {
    origins: { own: 0, foreign: 2 },
    // The country filter's own options count past it.
    countries: [
      { country: "US", count: 2 },
      { country: "NO", count: 1 },
      { country: "SE", count: 1 },
    ],
    denominations: [{ denomination: "1 dollar", count: 2 }],
  };

  test("from whole entries", () => {
    expect(counted(fromWholeEntries)).toEqual(expected);
  });

  test("from slim entries", () => {
    expect(counted(fromSlimEntries)).toEqual(expected);
  });
});

describe("sorted by Market value, Gain/loss and title", () => {
  const priced = [
    item("cheap", 1, {
      title: "Cheap coin",
      purchasePrice: 100,
      marketValue: 150,
    }),
    item("dear", 2, {
      title: "Dear coin",
      purchasePrice: 1000,
      marketValue: 900,
      quantity: 2,
    }),
    item("unpriced", 3, { title: "Åland coin" }),
    item("gift", 4, { title: "Gift coin", marketValue: 500 }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(priced, view, context).map((each) => each._id as string);

  test("by Market value, highest first, unpriced Items last", () => {
    expect(ids({ sort: "value" })).toEqual([
      "dear",
      "gift",
      "cheap",
      "unpriced",
    ]);
  });

  test("by Gain/loss, biggest first, Items without both prices last", () => {
    expect(ids({ sort: "gain" })).toEqual([
      "cheap",
      "dear",
      "unpriced",
      "gift",
    ]);
  });

  test("by title, A to Z in the person's language, accents as their letters", () => {
    expect(ids({ sort: "title" })).toEqual([
      "unpriced",
      "cheap",
      "dear",
      "gift",
    ]);
  });
});

describe("the Kept in filter", () => {
  const kept = [
    item("safe-1", 1, { title: "In the safe", storage: "Safe, tray 1" }),
    item("safe-2", 2, { title: "Also in the safe", storage: "safe,  TRAY 1" }),
    item("box", 3, { title: "In the box", storage: "Box" }),
    item("nowhere", 4, { title: "Nowhere" }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(kept, view, context).map((each) => each._id as string);

  test("matches a place whatever its capitals and spacing", () => {
    expect(ids({ storage: "SAFE, tray 1", sort: "oldest" })).toEqual([
      "safe-1",
      "safe-2",
    ]);
  });

  test("or the Items with no place recorded", () => {
    expect(ids({ storage: withoutStorage })).toEqual(["nowhere"]);
  });

  test("counts each place once, as first written, most used first", () => {
    const counted = countFilterOptions(kept, {}, context);
    expect(counted.storages).toEqual([
      { storage: "Safe, tray 1", count: 2 },
      { storage: "Box", count: 1 },
    ]);
    expect(counted.withoutStorage).toBe(1);
  });
});

describe("the tag filter", () => {
  const tagged = [
    item("sale-1", 1, { title: "Krone", tags: ["For sale", "Inherited"] }),
    item("sale-2", 2, { title: "Dime", tags: ["for SALE"] }),
    item("old", 3, { title: "Penny", tags: ["Inherited"] }),
    item("none", 4, { title: "Token" }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(tagged, view, context).map((each) => each._id as string);

  test("matches a tag whatever its capitals, accents and spacing", () => {
    expect(ids({ tag: " FOR  sale", sort: "oldest" })).toEqual([
      "sale-1",
      "sale-2",
    ]);
  });

  test("finds Items by their tags in the search too", () => {
    expect(ids({ search: "inherited", sort: "oldest" })).toEqual([
      "sale-1",
      "old",
    ]);
  });

  test("counts each tag once, as first written, most used first", () => {
    expect(countFilterOptions(tagged, {}, context).tags).toEqual([
      { tag: "For sale", count: 2 },
      { tag: "Inherited", count: 2 },
    ]);
    // Within the other filters, as each count is.
    expect(
      countFilterOptions(tagged, { tag: "Inherited" }, context).tags,
    ).toEqual([
      { tag: "For sale", count: 2 },
      { tag: "Inherited", count: 2 },
    ]);
    expect(
      countFilterOptions(tagged, { search: "penny" }, context).tags,
    ).toEqual([{ tag: "Inherited", count: 1 }]);
  });
});

describe("the year range and material filters", () => {
  const dated = [
    item("old", 1, { title: "Old silver", year: 1887, material: "silver" }),
    item("mid", 2, { title: "Mid copper", year: 1921, material: "copper" }),
    // A precious metal stands in for the material.
    item("new", 3, { title: "New silver", year: 2001, metal: "silver" }),
    item("undated", 4, { title: "Undated" }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(dated, view, context).map((each) => each._id as string);

  test("a range keeps the Items issued within it, either end open", () => {
    expect(ids({ yearFrom: 1900, yearTo: 1999 })).toEqual(["mid"]);
    expect(ids({ yearTo: 1899 })).toEqual(["old"]);
    expect(ids({ yearFrom: 1900 })).toEqual(["mid", "new"]);
  });

  test("a material matches the Item's own, or its precious metal", () => {
    expect(ids({ material: "silver" })).toEqual(["old", "new"]);
    expect(ids({ material: "copper", yearTo: 1899 })).toEqual([]);
  });

  test("counts decades oldest first, the span of years, and materials most used first", () => {
    const counted = countFilterOptions(dated, {}, context);
    expect(counted.decades).toEqual([
      { decade: 1880, count: 1 },
      { decade: 1920, count: 1 },
      { decade: 2000, count: 1 },
    ]);
    expect(counted.years).toEqual({ min: 1887, max: 2001 });
    expect(counted.materials).toEqual([
      { material: "silver", count: 2 },
      { material: "copper", count: 1 },
    ]);
  });
});

describe("search across the Item's texts", () => {
  const texts = [
    item("fair", 1, {
      title: "Krone",
      source: "Coin fair, Oslo",
      notes: "Bought with Anna",
      storage: "Safe",
    }),
    item("numista", 2, {
      title: "Øre",
      numistaNumber: 1234,
      gradeNote: "Scratched on the reverse",
      series: "Posthorn",
    }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(texts, view, context).map((each) => each._id as string);

  test("finds words in the source, the notes and the place it's kept in", () => {
    expect(ids({ search: "oslo anna" })).toEqual(["fair"]);
    expect(ids({ search: "safe" })).toEqual(["fair"]);
  });

  test("finds a Numista number however it's typed", () => {
    expect(ids({ search: "N# 1234" })).toEqual(["numista"]);
    expect(ids({ search: "n#1234" })).toEqual(["numista"]);
    expect(ids({ search: "1234" })).toEqual(["numista"]);
  });

  test("finds a grade note and a series", () => {
    expect(ids({ search: "scratched" })).toEqual(["numista"]);
    expect(ids({ search: "posthorn" })).toEqual(["numista"]);
  });
});

describe("the Items the Overview's Needs attention links show", () => {
  const photo = "photo" as Id<"_storage">;
  const attention = [
    item("valued", 1, {
      title: "Valued, graded, photographed",
      marketValue: 10,
      gradingScale: "european",
      grade: "XF",
      frontPhoto: photo,
    }),
    item("bare-coin", 2, { title: "Bare coin" }),
    item("bare-stamp", 3, { title: "Bare stamp", type: "stamp" }),
    item("back-only", 4, {
      title: "Back photo only",
      marketValue: 5,
      backPhoto: photo,
    }),
    item("more-only", 5, { title: "More photos only", marketValue: 5 }),
    item("sold", 6, { title: "Sold and bare", soldOn: "2026-09-30" }),
  ];
  const ids = (view: CollectionView) =>
    itemsInView(attention, view, {
      ...context,
      withMorePhotos: new Set(["more-only" as Id<"items">]),
    }).map((each) => each._id as string);

  test("without a Market value: owned Items of any type", () => {
    expect(ids({ without: "marketValue", sort: "oldest" })).toEqual([
      "bare-coin",
      "bare-stamp",
    ]);
  });

  test("without a photo: no side photo and no more photos", () => {
    expect(ids({ without: "photo", sort: "oldest" })).toEqual([
      "bare-coin",
      "bare-stamp",
    ]);
  });

  test("without a Grade: coins and banknotes only", () => {
    expect(ids({ without: "grade", sort: "oldest" })).toEqual([
      "bare-coin",
      "back-only",
      "more-only",
    ]);
  });

  test("on the sold view, the sold Items that lack it", () => {
    expect(ids({ without: "photo", status: "sold" })).toEqual(["sold"]);
  });
});
