import { describe, expect, test } from "bun:test";
import {
  type FileRow,
  type NodeValues,
  checkNode,
  fieldsFromValues,
  kindOf,
  readCatalogFile,
  sameValues,
  valuesFromFields,
} from "../fields";
import { creditRequired, fitWithin, fullImageBounds } from "../imageRules";
import { euroBanknoteSpecimens, euroBanknotes } from "./euroBanknotes";
import { euroCirculationCoins } from "./euroCirculationCoins";
import { euroCommemoratives } from "./euroCommemoratives";
import { norway } from "./norway";
import { romania } from "./romania";
import { usCoinProgrammes } from "./usCoinProgrammes";
import { usSilverDollars } from "./usSilverDollars";

const file = readCatalogFile(euroBanknotes);
const rows = file.rows;
const byKey = new Map(rows.map((row) => [row.key, row]));
/** A row as a first load stores it. */
const valuesOf = (row: FileRow) =>
  ({ sortOrder: 0, ...row.values }) as NodeValues;
const kindOfRow = (row: FileRow) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const childrenOf = (key: string) => rows.filter((row) => row.parentKey === key);
const entries = rows.filter((row) => kindOfRow(row) === "entry");
const entry = (key: string) => {
  const row = byKey.get(key);
  if (!row) throw new Error(`No row ${key}`);
  return row.values;
};

describe("the euro banknotes dataset, read by the Catalog CSV import", () => {
  test("reads without a problem", () => {
    expect(file.errors).toEqual([]);
  });

  test("every row meets the rules for its kind of node", () => {
    const problems = rows.flatMap((row) =>
      checkNode(valuesOf(row), kindOfRow(row)).map((problem) => ({
        key: row.key,
        ...problem,
      })),
    );
    expect(problems).toEqual([]);
  });

  test("every parent_id names a row in the file", () => {
    const orphans = rows.filter(
      (row) => row.parentKey && !byKey.has(row.parentKey),
    );
    expect(orphans.map((row) => row.key)).toEqual([]);
  });

  test("loading it a second time finds every row unchanged", () => {
    const changed = rows.filter((row) => {
      const values = valuesOf(row);
      return !sameValues(values, valuesFromFields(fieldsFromValues(values)));
    });
    expect(changed.map((row) => row.key)).toEqual([]);
  });

  test("shares no id with the other bundled datasets", () => {
    const others = new Set(
      [
        euroCirculationCoins,
        euroCommemoratives,
        norway,
        romania,
        usCoinProgrammes,
        usSilverDollars,
      ].flatMap((csv) => readCatalogFile(csv).rows.map((row) => row.key)),
    );
    expect(rows.filter((row) => others.has(row.key))).toEqual([]);
  });
});

describe("its tree", () => {
  test("is a Theme with the two series below it, and no country anywhere", () => {
    const roots = rows.filter((row) => !row.parentKey);
    expect(
      roots.map((row) => [row.key, kindOfRow(row), row.values.title]),
    ).toEqual([["eur-banknotes", "theme", "Euro banknotes"]]);
    expect(
      childrenOf("eur-banknotes").map((row) => [
        kindOfRow(row),
        row.values.title,
        row.values.yearFrom,
        row.values.yearTo,
      ]),
    ).toEqual([
      ["grouping", "First series", 2002, undefined],
      ["grouping", "Europa series", 2013, 2019],
    ]);
    expect(rows.filter((row) => row.values.country !== undefined)).toEqual([]);
  });

  test("has the seven notes of the first series and the six of the Europa series", () => {
    const [first, europa] = childrenOf("eur-banknotes").map((row) => row.key);
    expect(
      childrenOf(first ?? "").map((row) => row.values.denomination),
    ).toEqual([
      "5 euro",
      "10 euro",
      "20 euro",
      "50 euro",
      "100 euro",
      "200 euro",
      "500 euro",
    ]);
    expect(
      childrenOf(europa ?? "").map((row) => row.values.denomination),
    ).toEqual([
      "5 euro",
      "10 euro",
      "20 euro",
      "50 euro",
      "100 euro",
      "200 euro",
    ]);
    expect(entries).toHaveLength(13);
    expect(entries.every((row) => row.values.itemType === "banknote")).toBe(
      true,
    );
  });
});

describe("its entries", () => {
  test("a first-series note: its size, issue date, colour and style", () => {
    expect(entry("eur-banknotes-500-euro-2002")).toMatchObject({
      title: "500 euro 2002",
      itemType: "banknote",
      denomination: "500 euro",
      series: "First series",
      yearFrom: 2002,
      width: 160,
      height: 82,
      issueDate: "2002-01-01",
      withdrawalDate: undefined,
    });
    expect(entry("eur-banknotes-500-euro-2002").technicalDetails).toContain(
      "Colour: purple.",
    );
    expect(entry("eur-banknotes-500-euro-2002").technicalDetails).toContain(
      "Modern 20th-century architecture",
    );
  });

  test("the €500 is no longer issued, in the ECB's words, but stays legal tender", () => {
    expect(entry("eur-banknotes-500-euro-2002").historicalNotes).toContain(
      "has not been issued since 27 April 2019",
    );
    expect(entries.filter((row) => row.values.withdrawalDate)).toEqual([]);
  });

  test("a Europa-series note: its own issue date, size and designer", () => {
    expect(entry("eur-banknotes-100-euro-2019")).toMatchObject({
      title: "100 euro 2019, Europa series",
      denomination: "100 euro",
      series: "Europa series",
      yearFrom: 2019,
      width: 147,
      height: 77,
      issueDate: "2019-05-28",
      designers: "Reinhold Gerstetter",
    });
    expect(
      ["5", "10", "20", "50", "100", "200"].map(
        (value) =>
          entries.find(
            (row) =>
              row.values.series === "Europa series" &&
              row.values.denomination === `${value} euro`,
          )?.values.issueDate,
      ),
    ).toEqual([
      "2013-05-02",
      "2014-09-23",
      "2015-11-25",
      "2017-04-04",
      "2019-05-28",
      "2019-05-28",
    ]);
  });

  test("no first-series note names a designer no ECB source names", () => {
    expect(
      entries.filter(
        (row) => row.values.series === "First series" && row.values.designers,
      ),
    ).toEqual([]);
  });
});

describe("its credit", () => {
  const parts = ["Source", "Author", "Licence", "Link"] as const;

  test("every row credits its facts to the European Central Bank in full", () => {
    const uncredited = rows.filter(
      (row) =>
        parts.some((part) => !row.values[`facts${part}` as keyof NodeValues]) ||
        row.values.factsSource !== "European Central Bank",
    );
    expect(uncredited.map((row) => row.key)).toEqual([]);
    expect(entry("eur-banknotes-5-euro-2002").factsLicence).toContain(
      "free of charge",
    );
  });

  test("every row with notes credits them in full", () => {
    const uncredited = rows.filter(
      (row) =>
        (row.values.technicalDetails ?? row.values.historicalNotes) !==
          undefined &&
        parts.some((part) => !row.values[`notes${part}` as keyof NodeValues]),
    );
    expect(uncredited.map((row) => row.key)).toEqual([]);
  });

  test("each entry links its own source page", () => {
    expect(entry("eur-banknotes-5-euro-2013").factsLink).toBe(
      "https://www.ecb.europa.eu/press/pr/date/2013/html/pr130110_1.en.html",
    );
    expect(entry("eur-banknotes-100-euro-2019").factsLink).toBe(
      "https://www.ecb.europa.eu/press/pr/date/2018/html/ecb.pr180917.en.html",
    );
    expect(entry("eur-banknotes-5-euro-2002").factsLink).toBe(
      "https://www.ecb.europa.eu/euro/changeover/2002/html/index.en.html",
    );
  });

  test("links no image, but credits the ECB's specimen image for an admin to upload", () => {
    expect(rows.filter((row) => row.values.imageUrl !== undefined)).toEqual([]);
    for (const row of entries) {
      expect(row.values).toMatchObject({
        imageSource: "European Central Bank",
        imageAuthor: "European Central Bank",
        imageLicence:
          "Reproduced under Decision ECB/2013/10: specimen image, 72 dpi",
        imageLink:
          "https://www.ecb.europa.eu/euro/banknotes/images/html/index.en.html",
      });
      expect(creditRequired(row.values.imageLicence)).toBe(true);
    }
  });
});

describe("its specimen images", () => {
  test("names one front from the ECB's specimen set for each entry", () => {
    expect(Object.keys(euroBanknoteSpecimens).sort()).toEqual(
      entries.map((row) => row.key).sort(),
    );
    expect(
      Object.values(euroBanknoteSpecimens).every(({ file }) =>
        /(_fr_|Front)/.test(file),
      ),
    ).toBe(true);
  });

  test("stores each at no more than 72 dpi at the note's real size", () => {
    // 72 dpi over the note's real width, in whole pixels: 160 mm is 453 px.
    expect(
      fitWithin(
        euroBanknoteSpecimens["eur-banknotes-500-euro-2002"].size,
        fullImageBounds(
          { width: 160, height: 82 },
          "Reproduced under Decision ECB/2013/10: specimen image, 72 dpi",
        ) ?? { longest: 0, shortest: 0 },
      ),
    ).toEqual({ width: 453, height: 232 });
    for (const row of entries) {
      const { width, height, imageLicence } = row.values;
      const specimen =
        euroBanknoteSpecimens[row.key as keyof typeof euroBanknoteSpecimens];
      const bounds = fullImageBounds({ width, height }, imageLicence ?? "");
      expect(bounds).not.toBeNull();
      const stored = fitWithin(specimen.size, bounds ?? specimen.size.width);
      const inches = (millimetres = 0) => millimetres / 25.4;
      expect(stored.width / inches(width)).toBeLessThanOrEqual(72);
      expect(stored.height / inches(height)).toBeLessThanOrEqual(72);
    }
  });
});
