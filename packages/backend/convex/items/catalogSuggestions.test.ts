import { describe, expect, test } from "bun:test";
import { type CandidateEntry, catalogCandidates } from "./catalogSuggestions";

const entry = (
  key: string,
  fields: Omit<CandidateEntry, "key" | "title"> & { title?: string },
): CandidateEntry => ({ key, title: fields.title ?? key, ...fields });

const norway = {
  krone1958: entry("no-1-krone-1958-1972", {
    itemType: "coin",
    country: "NO",
    denomination: "1 krone",
    yearFrom: 1958,
    yearTo: 1972,
  }),
  krone1974: entry("no-1-krone-1974-1991", {
    itemType: "coin",
    country: "NO",
    denomination: "1 krone",
    yearFrom: 1974,
    yearTo: 1991,
  }),
  krone1997: entry("no-1-krone-1997", {
    itemType: "coin",
    country: "NO",
    denomination: "1 krone",
    yearFrom: 1997,
  }),
  ore1958: entry("no-50-ore-1958-1973", {
    itemType: "coin",
    country: "NO",
    denomination: "50 øre",
    yearFrom: 1958,
    yearTo: 1973,
  }),
  note1962: entry("no-note-10-kroner-1954-1983", {
    itemType: "banknote",
    country: "NO",
    denomination: "10 kroner",
    yearFrom: 1954,
    yearTo: 1983,
  }),
};
const sweden1960 = entry("se-1-krona-1952-1973", {
  itemType: "coin",
  country: "SE",
  denomination: "1 krona",
  yearFrom: 1952,
  yearTo: 1973,
});
const allEntries = [...Object.values(norway), sweden1960];
const keys = (entries: CandidateEntry[]) => entries.map(({ key }) => key);

describe("Catalog entries suggested for an Item", () => {
  test("a coin finds the entry of its country and denomination whose years include its year", () => {
    const krone1960 = {
      type: "coin" as const,
      country: "NO",
      denomination: "1 krone",
      year: 1960,
    };
    expect(keys(catalogCandidates(krone1960, allEntries))).toEqual([
      "no-1-krone-1958-1972",
    ]);
  });

  test("a banknote matches the same way, among banknotes only", () => {
    const note = {
      type: "banknote" as const,
      country: "NO",
      denomination: "10 Kroner",
      year: 1962,
    };
    expect(keys(catalogCandidates(note, allEntries))).toEqual([
      "no-note-10-kroner-1954-1983",
    ]);
    expect(
      catalogCandidates({ ...note, type: "coin" as const }, allEntries),
    ).toEqual([]);
  });

  test("a stamp never gets suggestions", () => {
    const stamp = {
      type: "stamp" as const,
      country: "NO",
      denomination: "1 krone",
      year: 1960,
    };
    expect(catalogCandidates(stamp, allEntries)).toEqual([]);
  });

  test("an Item without a country, year or denomination gets none", () => {
    const coin = { type: "coin" as const, denomination: "1 krone" };
    expect(catalogCandidates({ ...coin, year: 1960 }, allEntries)).toEqual([]);
    expect(catalogCandidates({ ...coin, country: "NO" }, allEntries)).toEqual(
      [],
    );
    expect(
      catalogCandidates(
        { type: "coin" as const, country: "NO", year: 1960 },
        allEntries,
      ),
    ).toEqual([]);
  });

  test("denominations match however they're written, by face value", () => {
    const coin = { type: "coin" as const, country: "NO", year: 1965 };
    expect(
      keys(
        catalogCandidates({ ...coin, denomination: "1 Kroner" }, allEntries),
      ),
    ).toEqual(["no-1-krone-1958-1972"]);
    expect(
      keys(catalogCandidates({ ...coin, denomination: "½ krone" }, allEntries)),
    ).toEqual(["no-50-ore-1958-1973"]);
    expect(
      catalogCandidates({ ...coin, denomination: "1 øre" }, allEntries),
    ).toEqual([]);
  });

  test("an entry without a last year is still issued; one without years never matches", () => {
    const coin = {
      type: "coin" as const,
      country: "NO",
      denomination: "1 krone",
    };
    const undated = entry("no-1-krone-undated", {
      itemType: "coin",
      country: "NO",
      denomination: "1 krone",
    });
    expect(
      keys(
        catalogCandidates({ ...coin, year: 2015 }, [...allEntries, undated]),
      ),
    ).toEqual(["no-1-krone-1997"]);
    expect(
      catalogCandidates({ ...coin, year: 1973 }, [...allEntries, undated]),
    ).toEqual([]);
  });

  test("an entry with no Item type is a coin's", () => {
    const untyped = entry("no-1-krone-1960", {
      country: "NO",
      denomination: "1 krone",
      yearFrom: 1960,
      yearTo: 1960,
    });
    const coin = {
      type: "coin" as const,
      country: "NO",
      denomination: "1 krone",
      year: 1960,
    };
    expect(keys(catalogCandidates(coin, [untyped]))).toEqual([
      "no-1-krone-1960",
    ]);
    expect(
      catalogCandidates({ ...coin, type: "banknote" as const }, [untyped]),
    ).toEqual([]);
  });

  test("best first: the denomination as written, then the most years up to the Item's, at most three", () => {
    const coin = {
      type: "coin" as const,
      country: "NO",
      denomination: "50 øre",
      year: 1960,
    };
    const candidates = [
      entry("open-1950", {
        itemType: "coin",
        country: "NO",
        denomination: "50 øre",
        yearFrom: 1950,
      }),
      entry("half-krone-1960", {
        itemType: "coin",
        country: "NO",
        denomination: "½ krone",
        yearFrom: 1960,
        yearTo: 1960,
      }),
      entry("wide-1940-1980", {
        itemType: "coin",
        country: "NO",
        denomination: "50 Øre",
        yearFrom: 1940,
        yearTo: 1980,
      }),
      entry("single-1960-b", {
        itemType: "coin",
        country: "NO",
        denomination: "50 øre",
        yearFrom: 1960,
        yearTo: 1960,
        title: "50 øre 1960 B",
      }),
      entry("single-1960-a", {
        itemType: "coin",
        country: "NO",
        denomination: "50 øre",
        yearFrom: 1960,
        yearTo: 1960,
        title: "50 øre 1960 A",
      }),
    ];
    expect(keys(catalogCandidates(coin, candidates))).toEqual([
      "wide-1940-1980",
      "open-1950",
      "single-1960-a",
    ]);
    expect(keys(catalogCandidates(coin, candidates, 10))).toEqual([
      "wide-1940-1980",
      "open-1950",
      "single-1960-a",
      "single-1960-b",
      "half-krone-1960",
    ]);
  });

  test("a general issue still struck comes before a commemorative of the Item's year", () => {
    const coin = {
      type: "coin" as const,
      country: "DE",
      denomination: "2 euro",
      year: 2024,
    };
    const candidates = [
      entry("de-2-euro-2024-mecklenburg", {
        itemType: "coin",
        country: "DE",
        denomination: "2 euro",
        yearFrom: 2024,
        yearTo: 2024,
      }),
      entry("de-eur-2-euro", {
        itemType: "coin",
        country: "DE",
        denomination: "2 euro",
        yearFrom: 2007,
      }),
    ];
    expect(keys(catalogCandidates(coin, candidates))).toEqual([
      "de-eur-2-euro",
      "de-2-euro-2024-mecklenburg",
    ]);
  });
});
