import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { romania } from "./romania";

const bnr = "Banca Națională a României";
const licence =
  "Redistribuit cu indicarea sursei; informațiile sunt disponibile gratuit pe www.bnr.ro. Modificări CoinsLite: aranjate în câmpurile Catalogului.";

const { rows, errors } = readCatalogFile(romania);
const keys = new Set(rows.map((row) => row.key));
const kindOfRow = (row: (typeof rows)[number]) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const entries = rows.filter((row) => kindOfRow(row) === "entry");
const below = (key: string) => {
  const found = new Set([key]);
  for (const row of rows)
    if (row.parentKey && found.has(row.parentKey)) found.add(row.key);
  return entries.filter((row) => found.has(row.key));
};

describe("the Romania dataset", () => {
  test("reads as a Catalog CSV file with no errors", () => {
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThan(0);
  });

  test("every node meets the Catalog's rules for its kind", () => {
    const problems = rows.flatMap((row) =>
      checkNode(row.values, kindOfRow(row)).map((problem) => ({
        id: row.key,
        ...problem,
      })),
    );
    expect(problems).toEqual([]);
  });

  test("has one root, Romania, and every parent_id names a row in the file", () => {
    const roots = rows.filter((row) => !row.parentKey);
    expect(roots.map((row) => [row.key, row.values.country])).toEqual([
      ["ro", "RO"],
    ]);
    expect(
      rows.filter((row) => row.parentKey && !keys.has(row.parentKey)),
    ).toEqual([]);
  });

  test("every row credits the BNR's facts in full, and its notes where it has them", () => {
    const uncredited = rows.filter((row) => {
      const v = row.values;
      const facts =
        v.factsSource === bnr &&
        v.factsAuthor === bnr &&
        v.factsLicence === licence &&
        v.factsLink?.startsWith("https://www.bnr.ro/");
      const hasNotes = v.technicalDetails || v.historicalNotes;
      const notes =
        !hasNotes ||
        (v.notesSource === bnr &&
          v.notesAuthor === bnr &&
          v.notesLicence === licence &&
          v.notesLink?.startsWith("https://www.bnr.ro/") &&
          v.notesLanguage === "ro");
      return !facts || !notes;
    });
    expect(uncredited.map((row) => row.key)).toEqual([]);
  });

  test("every entry is a Romanian coin or banknote with its denomination and year", () => {
    const incomplete = entries.filter(
      (row) =>
        row.values.country !== "RO" ||
        !row.values.itemType ||
        !row.values.denomination ||
        row.values.yearFrom === undefined,
    );
    expect(incomplete.map((row) => row.key)).toEqual([]);
  });

  test("has the circulation coins and notes, the polymer notes and the numismatic issues", () => {
    expect(
      below("ro-circulation-coins").map((row) => row.values.denomination),
    ).toEqual(["1 ban", "5 bani", "10 bani", "50 bani"]);
    expect(
      below("ro-banknotes-2005").map((row) => row.values.denomination),
    ).toEqual([
      "1 leu",
      "5 lei",
      "10 lei",
      "10 lei",
      "20 lei",
      "50 lei",
      "100 lei",
      "200 lei",
      "500 lei",
    ]);
    expect(
      below("ro-banknotes-2000").map((row) => row.values.denomination),
    ).toEqual([
      "10.000 lei",
      "50.000 lei",
      "100.000 lei",
      "500.000 lei",
      "1.000.000 lei",
    ]);
    expect(below("ro-numismatic").length).toBeGreaterThan(400);
  });

  test("keeps the BNR's maximum mintage in the notes, not as a mintage", () => {
    expect(entries.filter((row) => row.values.mintage !== undefined)).toEqual(
      [],
    );
    expect(
      entries.some((row) =>
        row.values.technicalDetails?.includes("Tiraj maxim"),
      ),
    ).toBe(true);
  });

  test("a spot check: the 2026 Nicolae Tonitza silver 10 lei", () => {
    const tonitza = rows.find((row) => row.key === "ro-bnr-25745-10-lei");
    expect(tonitza?.values).toMatchObject({
      itemType: "coin",
      denomination: "10 lei",
      yearFrom: 2026,
      issueDate: "2026-08-24",
      strike: "proof",
      material: "silver",
      metal: "silver",
      fineness: 0.999,
      weight: 31.103,
      edge: "reeded",
      factsLink: "https://www.bnr.ro/25745-pictori-romani-nicolae-tonitza",
    });
    expect(tonitza?.values.technicalDetails).toContain("Tiraj maxim: 500");
  });
});
