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
    });
  });

  test("reads LF line ends without a byte order mark, ignoring headings it doesn't know", () => {
    expect(readImportFile("Item type,Shelf,Title\nCoin,A3,2 øre\n")).toEqual({
      rows: [{ row: 2, type: "coin", title: "2 øre" }],
      rejected: [],
      ignoredHeadings: ["Shelf"],
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
    });
  });

  test("refuses a file with a quote left open", () => {
    expect(readImportFile('Item type,Title\r\nCoin,"2 øre\r\n')).toBe(
      "UNREADABLE_FILE",
    );
  });
});
