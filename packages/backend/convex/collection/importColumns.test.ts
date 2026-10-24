import { describe, expect, test } from "bun:test";
import {
  csvDelimiter,
  dateOrderIn,
  guessColumns,
  laidOutAsExport,
  needsItemType,
  readTable,
} from "./importColumns";

const table = (text: string) => {
  const read = readTable(text);
  if (typeof read === "string") throw new Error(read);
  return read;
};

describe("csvDelimiter", () => {
  test("is what the first line has most of, outside quotes", () => {
    expect(csvDelimiter("Title;Year;Grade\n2 øre,1918;1918;1\n")).toBe(";");
    expect(csvDelimiter("Title,Year\n")).toBe(",");
    expect(csvDelimiter('"Title;with;semicolons",Year\n')).toBe(",");
    expect(csvDelimiter("Title\tYear\tGrade\n")).toBe("\t");
  });
});

describe("guessColumns", () => {
  test("matches a Collection export's headings, in any language, as they are", () => {
    const headings = ["Objekttype", "Titel", "Year", "notes"];
    const columns = guessColumns(headings, [["Mynt", "2 øre", "1918", ""]]);
    expect(columns).toEqual(["type", "title", "year", "notes"]);
    expect(laidOutAsExport(headings, columns)).toBe(true);
  });

  test("guesses the columns of a Numista-style export", () => {
    const headings = [
      "N#",
      "Issuer",
      "Title",
      "Year",
      "Quantity",
      "Grade",
      "Price",
      "Acquisition date",
      "Storage location",
      "Private comment",
    ];
    const columns = guessColumns(headings, [
      [
        "1234",
        "Norway",
        "1 Krone - Olav V",
        "1975",
        "2",
        "XF",
        "€1.50",
        "2024-01-05",
        "Box 1",
        "",
      ],
    ]);
    expect(columns).toEqual([
      "numista_number",
      "country",
      "title",
      "year",
      "quantity",
      "grade",
      "purchasePrice",
      "purchaseDate",
      "storage",
      "notes",
    ]);
    expect(laidOutAsExport(headings, columns)).toBe(false);
  });

  test("guesses an OpenNumismat list: value and unit make the denomination, a type that isn't an Item type is left out", () => {
    const headings = [
      "Name",
      "Value",
      "Unit",
      "Country",
      "Year",
      "Mint mark",
      "Type",
      "Grade",
      "Date",
      "Price",
      "Seller",
      "Storage",
    ];
    const columns = guessColumns(headings, [
      [
        "1 krone",
        "1",
        "krone",
        "Norway",
        "1875",
        "",
        "Circulating",
        "VF",
        "05.03.2024",
        "120",
        "Oslo Mynthandel",
        "Album 1",
      ],
    ]);
    expect(columns).toEqual([
      "title",
      "denomination",
      "unit",
      "country",
      "year",
      "mint_mark",
      null,
      "grade",
      "purchaseDate",
      "purchasePrice",
      "source",
      "storage",
    ]);
  });

  test("guesses a CoinManage-style list: its value is the market value, its mint the mint mark", () => {
    const columns = guessColumns(
      [
        "Country",
        "Denomination",
        "Year",
        "Mint",
        "Grade",
        "Qty",
        "Purchase Price",
        "Value",
        "Notes",
      ],
      [["USA", "Cent", "1909", "S", "VF-20", "1", "$650.00", "$900.00", ""]],
    );
    expect(columns).toEqual([
      "country",
      "denomination",
      "year",
      "mint_mark",
      "grade",
      "quantity",
      "purchasePrice",
      "marketValue",
      "notes",
    ]);
  });

  test("gives each column to one heading, an export heading first", () => {
    expect(
      guessColumns(["Name", "Description", "Title"], [["a", "b", "c"]]),
    ).toEqual([null, "notes", "title"]);
    expect(guessColumns(["Name", "Description"], [["a", "b"]])).toEqual([
      "title",
      "notes",
    ]);
  });
});

describe("needsItemType and dateOrderIn", () => {
  test("ask for an Item type when rows have none", () => {
    const file = table("Title,Item type\n2 øre,Coin\n5 øre,\n");
    expect(needsItemType(file, ["title", "type"])).toBe(true);
    expect(needsItemType(file, ["title", null])).toBe(true);
    const typed = table("Title,Item type\n2 øre,Coin\n");
    expect(needsItemType(typed, ["title", "type"])).toBe(false);
  });

  test("tell the date order from the dates, or say it's unclear", () => {
    const columns = ["title", "purchaseDate"] as const;
    expect(
      dateOrderIn(table("Title,Bought\na,05/03/2024\nb,25/03/2024\n"), columns),
    ).toEqual({ order: "dmy", unclear: false });
    expect(dateOrderIn(table("Title,Bought\na,05/03/2024\n"), columns)).toEqual(
      { order: null, unclear: true },
    );
    expect(dateOrderIn(table("Title,Bought\na,2024-03-05\n"), columns)).toEqual(
      { order: null, unclear: false },
    );
  });
});
