import { describe, expect, test } from "bun:test";
import { formatCsvFile } from "../catalog/csvText";
import { readImportFile } from "./importRows";

describe("readImportFile", () => {
  test("reads back a file written the way the Collection export writes it", () => {
    // formatCsvFile is the export's writer: byte order mark, CRLF, quoting.
    const file = formatCsvFile([
      [
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
        // A heading in another of the five languages reads too.
        "Oppbevart i",
        // One of the import's own columns, which go by their key.
        "notes",
      ],
      [
        "Coin",
        'Krone, "Oscar II"',
        "1875",
        "1 krone",
        "1−",
        "Norwegian (0–3)",
        "Circulation",
        "Silver · 0.800 fine",
        "Norway",
        "2",
        "1250.50",
        "1400.00",
        "NOK",
        "2024-03-05",
        "Oslo Mynthandel",
        "Safe, tray 3",
        "Bought as a pair,\nboth in one envelope",
      ],
      [
        "Stamp",
        "Posthorn",
        "1872",
        "",
        "Used",
        "Stamp grades",
        "",
        "",
        "NO",
        "1",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ]);

    expect(readImportFile(file)).toEqual({
      rows: [
        {
          row: 2,
          type: "coin",
          title: 'Krone, "Oscar II"',
          year: 1875,
          denomination: "1 krone",
          gradingScale: "norwegian",
          grade: "1-",
          strike: "circulation",
          material: "silver",
          materialNote: "0.800 fine",
          country: "NO",
          quantity: 2,
          purchasePrice: 125050,
          marketValue: 140000,
          currency: "NOK",
          purchaseDate: "2024-03-05",
          source: "Oslo Mynthandel",
          storage: "Safe, tray 3",
          notes: "Bought as a pair,\nboth in one envelope",
        },
        {
          row: 3,
          type: "stamp",
          title: "Posthorn",
          year: 1872,
          gradingScale: "stamp",
          grade: "used",
          country: "NO",
          quantity: 1,
        },
      ],
      rejected: [],
      ignoredHeadings: [],
      unread: { countries: [], grades: [] },
    });
  });

  test("reads LF line ends without a byte order mark, ignoring headings it doesn't know", () => {
    expect(readImportFile("Item type,Shelf,Title\nCoin,A3,2 øre\n")).toEqual({
      rows: [{ row: 2, type: "coin", title: "2 øre" }],
      rejected: [],
      ignoredHeadings: ["Shelf"],
      unread: { countries: [], grades: [] },
    });
  });

  test("leaves out a row it can't read, by its row number in the file, blank rows counting", () => {
    expect(
      readImportFile(
        "Item type,Title,Year\r\nCoin,2 øre,1918\r\n\r\nMedal,Olympics,1952\r\nCoin,5 øre,ninety\r\n",
      ),
    ).toEqual({
      rows: [{ row: 2, type: "coin", title: "2 øre", year: 1918 }],
      rejected: [
        { row: 4, reason: "UNKNOWN_TYPE" },
        { row: 5, reason: "INVALID_NUMBER" },
      ],
      ignoredHeadings: [],
      unread: { countries: [], grades: [] },
    });
  });

  test("reads a semicolon file from another app by the columns guessed", () => {
    const file = [
      "N#;Issuer;Title;Year;Quantity;Grade;Price;Acquisition date;Private comment",
      "1234;Norway;1 Krone - Olav V;1975;2;XF;kr 15,50;05/03/2024;From the flea market",
      "5678;German Empire;5 Mark - Wilhelm II;1913;1;AU;€120;25/03/2024;",
      "910;Norway;10 Kroner;ND;1;Proof;;;",
    ].join("\r\n");
    expect(readImportFile(file, { itemType: "coin", locale: "en" })).toEqual({
      rows: [
        {
          row: 2,
          type: "coin",
          title: "1 Krone - Olav V",
          numistaNumber: 1234,
          country: "NO",
          year: 1975,
          quantity: 2,
          gradingScale: "european",
          grade: "XF",
          purchasePrice: 1550,
          currency: "KR",
          purchaseDate: "2024-03-05",
          notes: "From the flea market",
        },
        {
          row: 3,
          type: "coin",
          title: "5 Mark - Wilhelm II",
          numistaNumber: 5678,
          year: 1913,
          quantity: 1,
          gradeNote: "AU",
          purchasePrice: 12000,
          currency: "€",
          purchaseDate: "2024-03-25",
          notes: "Country: German Empire",
        },
        {
          row: 4,
          type: "coin",
          title: "10 Kroner",
          numistaNumber: 910,
          country: "NO",
          quantity: 1,
          strike: "proof",
        },
      ],
      rejected: [],
      ignoredHeadings: [],
      unread: { countries: ["German Empire"], grades: ["AU"] },
    });
  });

  test("reads by the columns chosen, joining value and unit and naming untitled rows", () => {
    expect(
      readImportFile("Value,Unit,Year,Shelf\n1,krone,1875,A3\n", {
        columns: ["denomination", "unit", "year", "storage"],
        itemType: "coin",
        locale: "nb",
      }),
    ).toEqual({
      rows: [
        {
          row: 2,
          type: "coin",
          title: "1 krone 1875",
          denomination: "1 krone",
          year: 1875,
          storage: "A3",
        },
      ],
      rejected: [],
      ignoredHeadings: [],
      unread: { countries: [], grades: [] },
    });
  });

  test("keeps an unknown country in the notes in the language chosen", () => {
    const read = readImportFile(
      "Title,Country\n1 Mark,Deutsches Kaiserreich\n",
      {
        itemType: "coin",
        locale: "de",
      },
    );
    expect(typeof read !== "string" && read.rows[0]?.notes).toBe(
      "Land: Deutsches Kaiserreich",
    );
  });

  test("leaves out a row whose amounts are in two currencies", () => {
    const read = readImportFile(
      "Title,Price,Market value\n1 Mark,€5,£6\n2 Mark,€5,€7\n",
      { itemType: "coin" },
    );
    expect(typeof read !== "string" && read.rejected).toEqual([
      { row: 2, reason: "OTHER_CURRENCY" },
    ]);
  });

  test("refuses columns that don't exist or name a field twice, and a file with none", () => {
    const file = "Title,Year\n2 øre,1918\n";
    expect(readImportFile(file, { columns: ["title", "vintage"] })).toBe(
      "INVALID_COLUMNS",
    );
    expect(readImportFile(file, { columns: ["title", "title"] })).toBe(
      "INVALID_COLUMNS",
    );
    expect(readImportFile(file, { columns: [null, null] })).toBe(
      "NO_KNOWN_HEADINGS",
    );
  });

  test("refuses a file with a quote left open", () => {
    expect(readImportFile('Item type,Title\r\nCoin,"2 øre\r\n')).toBe(
      "UNREADABLE_FILE",
    );
  });
});
