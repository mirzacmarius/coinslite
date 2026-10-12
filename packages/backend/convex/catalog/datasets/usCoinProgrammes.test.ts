import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { usCoinProgrammes } from "./usCoinProgrammes";
import { usSilverDollars } from "./usSilverDollars";

const file = readCatalogFile(usCoinProgrammes);
const byKey = new Map(file.rows.map((row) => [row.key, row]));
const silverDollarKeys = readCatalogFile(usSilverDollars).rows.map(
  (row) => row.key,
);

const kindOfRow = (row: (typeof file.rows)[number]) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const entriesBelow = (key: string) =>
  file.rows.filter((row) => row.parentKey === key);

describe("the US circulating coin programmes dataset", () => {
  test("reads as a Catalog CSV file with no problems", () => {
    expect(file.errors).toEqual([]);
    for (const row of file.rows) {
      expect({
        key: row.key,
        problems: checkNode(row.values, kindOfRow(row)),
      }).toEqual({ key: row.key, problems: [] });
    }
  });

  test("hangs every programme from the existing United States root without touching its keys", () => {
    expect(byKey.has("us")).toBe(false);
    for (const row of file.rows) {
      const parent = row.parentKey as string;
      expect(parent === "us" || byKey.has(parent)).toBe(true);
      expect(silverDollarKeys).not.toContain(row.key);
    }
    // The silver dollars keep their root, two series and 120 entries.
    expect(silverDollarKeys).toHaveLength(123);
    expect(
      file.rows
        .filter((row) => row.parentKey === "us")
        .map((row) => row.values.title),
    ).toEqual([
      "50 State Quarters",
      "DC and U.S. Territories Quarters",
      "America the Beautiful Quarters",
      "American Women Quarters",
      "Presidential $1 Coins",
      "Native American $1 Coins",
    ]);
  });

  test("has an entry for each design and circulation mint", () => {
    expect(entriesBelow("us-50-state-quarters")).toHaveLength(50 * 2);
    expect(entriesBelow("us-dc-and-territories-quarters")).toHaveLength(6 * 2);
    // The Mint's pages don't list West Point for the 2019 and 2020 quarters.
    expect(entriesBelow("us-america-the-beautiful-quarters")).toHaveLength(
      56 * 2,
    );
    // The pages online cover 2022 to 2024.
    expect(entriesBelow("us-american-women-quarters")).toHaveLength(15 * 2);
    expect(entriesBelow("us-presidential-dollars")).toHaveLength(40 * 2);
    // 2009 to 2024; the 2024 page lists Philadelphia alone.
    expect(entriesBelow("us-native-american-dollars")).toHaveLength(16 * 2 - 1);
    for (const row of file.rows.filter((row) => row.addable)) {
      expect(row.values.strike).toBe("circulation");
      expect(["P", "D", "W"]).toContain(row.values.mintMark as string);
      if (row.values.mintMark === "W") {
        expect(row.values.denomination).toBe("25 cents");
        expect([2019, 2020]).toContain(row.values.yearFrom as number);
      }
    }
  });

  test("describes the Delaware quarter struck at Denver", () => {
    const delaware = byKey.get("us-quarter-1999-delaware-d");
    expect(delaware?.parentKey).toBe("us-50-state-quarters");
    expect(delaware?.values).toMatchObject({
      title: "Delaware quarter 1999-D",
      itemType: "coin",
      country: "US",
      denomination: "25 cents",
      series: "50 State Quarters",
      yearFrom: 1999,
      yearTo: 1999,
      strike: "circulation",
      material: "cupronickel",
      composition: "copper 91.67%; nickel 8.33%",
      weight: 5.67,
      diameter: 24.26,
      thickness: 1.75,
      edge: "reeded",
      mint: "Denver",
      mintMark: "D",
      designers: "John Flanagan; William Cousins",
      issueDate: "1999-01-04",
      factsLink:
        "https://www.usmint.gov/learn/coins-and-medals/circulating-coins/quarter/50-state-quarters/delaware",
    });
    expect(delaware?.values.technicalDetails).toStartWith(
      "The obverse (heads) design features the familiar image of George Washington by John Flanagan",
    );
  });

  test("credits every row's facts and notes to the US Mint in full", () => {
    for (const row of file.rows) {
      for (const group of ["facts", "notes"] as const) {
        expect(row.values).toMatchObject({
          [`${group}Source`]: "United States Mint",
          [`${group}Author`]: "United States Mint",
          [`${group}Licence`]: "Public domain (17 U.S.C. § 105)",
        });
        expect(row.values[`${group}Link`]).toMatch(
          /^https:\/\/(www\.usmint\.gov\/|web\.archive\.org\/web\/\d{14}\/https:\/\/www\.usmint\.gov\/)/,
        );
      }
    }
  });
});
