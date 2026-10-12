import { describe, expect, test } from "bun:test";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type SlimEntry,
  entryFacts,
  slimEntryOf,
  withCatalogFacts,
} from "../items/catalogFacts";
import type { CollectionView } from "./view";
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
