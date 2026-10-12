import { describe, expect, test } from "bun:test";
import {
  type CatalogFacts,
  detachedFields,
  entryFacts,
  slimEntryOf,
} from "./catalogFacts";

/** A Catalog entry as stored, with the long notes the Collection never shows. */
const morganDollar = {
  key: "us-morgan-dollar-1881-s",
  kind: "entry" as const,
  path: "us/us-morgan-dollar/us-morgan-dollar-1881-s",
  title: "Morgan dollar 1881-S",
  sortOrder: 3,
  itemType: "coin" as const,
  country: "US",
  denomination: "1 dollar",
  series: "Morgan dollar",
  material: "silver" as const,
  strike: "circulation" as const,
  metal: "silver" as const,
  weight: 26.73,
  fineness: 0.9,
  diameter: 38.1,
  yearFrom: 1881,
  mint: "San Francisco",
  mintMark: "S",
  composition: [
    { metal: "silver" as const, percent: 90 },
    { metal: "copper" as const, percent: 10 },
  ],
  edge: "reeded" as const,
  thickness: 2.4,
  designers: ["George T. Morgan"],
  mintage: 12760000,
  issueDate: "1881",
  technicalDetails: "Struck at the San Francisco Mint. ".repeat(200),
  historicalNotes: "The Bland-Allison Act of 1878 required… ".repeat(400),
  notesLanguage: "en",
  notesTranslations: { nb: { historicalNotes: "Bland-Allison… ".repeat(400) } },
  imageUrl: "https://example.org/morgan-1881-s.jpg",
  numistaId: 1492,
  searchText: "morgan dollar 1881-s 1 dollar morgan dollar us",
  countryNodeKey: "us",
};

describe("the slim entry an Item is resolved from", () => {
  test("keeps the entry's key, title and the facts Items take, and nothing else", () => {
    expect(slimEntryOf(morganDollar)).toEqual({
      key: "us-morgan-dollar-1881-s",
      title: "Morgan dollar 1881-S",
      itemType: "coin",
      country: "US",
      denomination: "1 dollar",
      series: "Morgan dollar",
      material: "silver",
      strike: "circulation",
      metal: "silver",
      weight: 26.73,
      fineness: 0.9,
      diameter: 38.1,
      thickness: 2.4,
      mintMark: "S",
      mintage: 12760000,
      yearFrom: 1881,
      numistaId: 1492,
    });
  });

  test("gives an Item the same facts as the whole entry", () => {
    const facts: CatalogFacts = {
      country: "US",
      year: 1881,
      denomination: "1 dollar",
      series: "Morgan dollar",
      material: "silver",
      strike: "circulation",
      diameter: 38.1,
      thickness: 2.4,
      mintMark: "S",
      mintage: 12760000,
      numistaNumber: 1492,
      metal: "silver",
      weight: 26.73,
      purity: 0.9,
    };
    const slim = slimEntryOf(morganDollar);
    expect(slim && entryFacts(slim)).toEqual(facts);
    expect(entryFacts(morganDollar)).toEqual(facts);
  });

  test("isn't kept for a grouping, country or Theme", () => {
    const grouping = {
      key: "us-morgan-dollar",
      kind: "grouping" as const,
      title: "Morgan dollar",
      country: "US",
      denomination: "1 dollar",
      historicalNotes: "Minted from 1878 to 1904, and again in 1921.",
    };
    expect(slimEntryOf(grouping)).toBeNull();
    expect(
      slimEntryOf({ key: "us", kind: "country", title: "USA" }),
    ).toBeNull();
    expect(
      slimEntryOf({ key: "euro-2", kind: "theme", title: "2 euro" }),
    ).toBeNull();
  });
});

describe("an Item whose Catalog entry leaves the Catalog", () => {
  test("keeps its own facts, takes the entry's as its own, keeps the Catalog-only facts and drops the link", () => {
    const item = {
      type: "coin" as const,
      title: "Morgan dollar 1881-S",
      quantity: 2,
      // The person's own: they read the mint mark differently.
      mintMark: "CC",
      catalogEntryId: "entry-id",
    };
    const detached: object = detachedFields(item, morganDollar);
    expect(detached).toEqual({
      type: "coin",
      title: "Morgan dollar 1881-S",
      quantity: 2,
      mintMark: "CC",
      country: "US",
      year: 1881,
      denomination: "1 dollar",
      series: "Morgan dollar",
      material: "silver",
      strike: "circulation",
      diameter: 38.1,
      thickness: 2.4,
      mintage: 12760000,
      numistaNumber: 1492,
      metal: "silver",
      weight: 26.73,
      purity: 0.9,
      catalogDetails: {
        mint: "San Francisco",
        composition: [
          { metal: "silver", percent: 90 },
          { metal: "copper", percent: 10 },
        ],
        edge: "reeded",
        designers: ["George T. Morgan"],
        issueDate: "1881",
      },
      catalogEntryId: undefined,
    });
  });

  test("has no Catalog-only facts to keep from an entry without any", () => {
    const item = {
      type: "banknote" as const,
      year: 1977,
      catalogEntryId: "entry-id",
    };
    const detached: object = detachedFields(item, {
      itemType: "banknote",
      country: "NO",
      denomination: "100 kroner",
    });
    expect(detached).toEqual({
      type: "banknote",
      year: 1977,
      country: "NO",
      denomination: "100 kroner",
      catalogDetails: undefined,
      catalogEntryId: undefined,
    });
  });
});
