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
import { euroCirculationCoins } from "./euroCirculationCoins";
import { euroCommemoratives } from "./euroCommemoratives";
import { norway } from "./norway";
import { usSilverDollars } from "./usSilverDollars";

const file = readCatalogFile(euroCirculationCoins);
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

/** The ECB's issuers of euro coins in 2026, as ISO 3166-1 alpha-2. */
const issuers = [
  "AD",
  "AT",
  "BE",
  "BG",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
  "SM",
  "VA",
];

describe("the euro circulation coins dataset, read by the Catalog CSV import", () => {
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
      [euroCommemoratives, norway, usSilverDollars].flatMap((csv) =>
        readCatalogFile(csv).rows.map((row) => row.key),
      ),
    );
    expect(rows.filter((row) => others.has(row.key))).toEqual([]);
  });
});

describe("its credit", () => {
  const parts = ["source", "author", "licence", "link"] as const;
  const capital = (part: string) =>
    part.charAt(0).toUpperCase() + part.slice(1);

  test("every row credits its facts in full", () => {
    const uncredited = rows.filter((row) =>
      parts.some(
        (part) => !row.values[`facts${capital(part)}` as keyof NodeValues],
      ),
    );
    expect(uncredited.map((row) => row.key)).toEqual([]);
  });

  test("every row with notes credits them in full, in each language", () => {
    const uncredited = rows.filter((row) => {
      const v = row.values as Record<string, unknown>;
      const groups = [
        ["notes", v.technicalDetails ?? v.historicalNotes],
        ...["De", "Fr", "Ro", "Nb"].map((language) => [
          `notes${language}`,
          v[`technicalDetails${language}`] ?? v[`historicalNotes${language}`],
        ]),
      ] as const;
      return groups.some(
        ([group, notes]) =>
          notes !== undefined &&
          parts.some((part) => !v[`${group}${capital(part)}`]),
      );
    });
    expect(uncredited.map((row) => row.key)).toEqual([]);
  });

  test("every row credits the European Central Bank", () => {
    expect(
      rows.filter(
        (row) => !row.values.factsSource?.includes("European Central Bank"),
      ),
    ).toEqual([]);
  });

  test("the alloy of the Nordic gold coins credits the regulation that sets it", () => {
    const fiftyCent = entry("de-eur-50-cent-series-1-coin");
    expect(fiftyCent.composition).toBe(
      "copper 89%; aluminium 5%; zinc 5%; tin 1%",
    );
    expect(fiftyCent.factsSource).toContain("Regulation (EU) No 729/2014");
    expect(fiftyCent.factsLicence).toContain("2011/833/EU");
  });

  test("invents no mintage and shows no image", () => {
    expect(
      rows.filter(
        (row) =>
          row.values.mintage !== undefined || row.values.imageUrl !== undefined,
      ),
    ).toEqual([]);
  });
});

describe("its tree", () => {
  test("has one country root per issuer", () => {
    const roots = rows.filter((row) => kindOfRow(row) === "country");
    expect(roots.map((row) => row.values.country).sort()).toEqual(issuers);
    expect(roots.map((row) => row.key).sort()).toEqual(
      issuers.map((code) => code.toLowerCase()),
    );
  });

  test("gives every issuer its eight denominations", () => {
    for (const code of issuers) {
      expect(
        childrenOf(code.toLowerCase()).map((row) => row.values.denomination),
      ).toEqual([
        "1 cent",
        "2 cent",
        "5 cent",
        "10 cent",
        "20 cent",
        "50 cent",
        "1 euro",
        "2 euro",
      ]);
    }
  });

  test("has an entry for each design series the ECB shows, 295 in all", () => {
    const perDenomination = (denomination: string) =>
      entries.filter((row) => row.values.denomination === denomination).length;
    // The images on the ECB's national-side pages, read 2026-10-12.
    expect(
      [
        "2 euro",
        "1 euro",
        "50 cent",
        "20 cent",
        "10 cent",
        "5 cent",
        "2 cent",
        "1 cent",
      ].map(perDenomination),
    ).toEqual([38, 38, 37, 37, 37, 36, 36, 36]);
    expect(entries).toHaveLength(295);
  });

  test("puts each entry below its design series, below its denomination", () => {
    const misplaced = entries.filter((row) => {
      const series = byKey.get(row.parentKey ?? "");
      const denomination = byKey.get(series?.parentKey ?? "");
      return (
        series?.values.series !== row.values.series ||
        denomination?.values.denomination !== row.values.denomination ||
        denomination?.parentKey !== row.values.country?.toLowerCase()
      );
    });
    expect(misplaced.map((row) => row.key)).toEqual([]);
  });

  test("names the design series as the ECB counts them", () => {
    expect(
      childrenOf("be-eur-2-euro").map((row) => [
        row.values.title,
        row.values.yearFrom,
        row.values.yearTo,
      ]),
    ).toEqual([
      ["First series", 2002, 2007],
      ["Second series", 2008, 2013],
      ["Third series", 2014, undefined],
    ]);
    expect(
      childrenOf("va-eur-1-cent").map((row) => [
        row.values.yearFrom,
        row.values.yearTo,
      ]),
    ).toEqual([
      [2002, 2005],
      [2005, 2006],
      [2006, 2013],
      [2014, 2016],
      [2017, undefined],
    ]);
  });
});

describe("its entries", () => {
  test("a German 2-euro coin has the common side's facts and its national side's", () => {
    expect(entry("de-eur-2-euro-series-1-coin")).toMatchObject({
      itemType: "coin",
      title: "2 euro 2002–",
      country: "DE",
      denomination: "2 euro",
      series: "First series",
      strike: "circulation",
      material: "bimetallic",
      weight: 8.5,
      diameter: 25.75,
      thickness: 2.2,
      edge: "lettered",
      yearFrom: 2002,
      yearTo: undefined,
      designers: "Heinz Hoyer; Sneschana Russewa-Hoyer",
      composition: undefined,
    });
    expect(entry("de-eur-2-euro-series-1-coin").edgeLettering).toStartWith(
      "EINIGKEIT UND RECHT UND FREIHEIT",
    );
  });

  test("a joiner's coins start the year it joined", () => {
    expect(entry("hr-eur-1-euro-series-1-coin").yearFrom).toBe(2023);
    expect(entry("bg-eur-1-cent-series-1-coin").yearFrom).toBe(2026);
  });

  test("a year the ECB doesn't give stays empty", () => {
    expect(entry("ad-eur-2-euro-series-1-coin")).toMatchObject({
      title: "2 euro, first series",
      yearFrom: undefined,
      yearTo: undefined,
    });
  });

  test("the cent coins have their own metal and size", () => {
    expect(entry("fi-eur-1-cent-series-1-coin")).toMatchObject({
      material: "steel",
      weight: 2.3,
      diameter: 16.25,
      thickness: 1.67,
      edge: "plain",
      designers: "Heikki Häiväoja",
    });
    expect(entry("fi-eur-20-cent-series-1-coin")).toMatchObject({
      material: "aluminiumBronze",
      weight: 5.74,
    });
  });

  test("the ECB's design text is the technical details, in each language it publishes", () => {
    const austria = entry("at-eur-2-euro-series-1-coin");
    expect(austria.technicalDetails).toContain("Bertha von Suttner");
    expect(austria.technicalDetailsDe).toContain("Bertha von Suttner");
    expect(austria.technicalDetailsFr).toContain("Bertha von Suttner");
    expect(austria.technicalDetailsRo).toContain("Bertha von Suttner");
    expect(austria.notesDeLink).toBe(
      "https://www.ecb.europa.eu/euro/coins/2euro/html/index.de.html",
    );
  });
});
