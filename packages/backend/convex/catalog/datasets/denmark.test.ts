import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { denmark } from "./denmark";

const bank = "Danmarks Nationalbank";
const licence =
  "Kopieret fra Danmarks Nationalbanks hjemmeside, som tillader kopiering med Danmarks Nationalbank anført som kilde. Kilde: Danmarks Nationalbank.";

const file = readCatalogFile(denmark);
const byKey = new Map(file.rows.map((row) => [row.key, row]));

const kindOfRow = (row: (typeof file.rows)[number]) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const below = (key: string) => file.rows.filter((row) => row.parentKey === key);
const entries = file.rows.filter((row) => row.addable);

describe("the Denmark dataset", () => {
  test("reads as a Catalog CSV file with no problems", () => {
    expect(file.errors).toEqual([]);
    for (const row of file.rows) {
      expect({
        key: row.key,
        problems: checkNode(row.values, kindOfRow(row)),
      }).toEqual({ key: row.key, problems: [] });
    }
  });

  test("hangs every row from a row in the file, below one Denmark root", () => {
    const roots = file.rows.filter((row) => row.parentKey === null);
    expect(roots.map((row) => row.key)).toEqual(["dk"]);
    expect(roots[0]?.values).toMatchObject({ title: "Denmark", country: "DK" });
    for (const row of file.rows.filter((row) => row.parentKey !== null))
      expect(byKey.has(row.parentKey as string)).toBe(true);
  });

  test("groups the coins by denomination, then series", () => {
    expect(below("dk").map((row) => row.values.title)).toEqual([
      "50 øre",
      "1 krone",
      "2 kroner",
      "5 kroner",
      "10 kroner",
      "20 kroner",
      "200 kroner",
      "500 kroner",
      "1000 kroner",
      "3000 kroner",
    ]);
    expect(below("dk-20-kroner").map((row) => row.values.title)).toEqual([
      "Frederik X",
      "Margrethe II",
      "Tower coins",
      "Ship coins",
      "Science coins",
      "Commemorative coins",
    ]);
    expect(below("dk-10-kroner").map((row) => row.values.title)).toEqual([
      "Frederik X",
      "Margrethe II",
      "Fairy tale coins",
      "Polar coins",
    ]);
    for (const denomination of below("dk"))
      for (const series of below(denomination.key))
        expect(below(series.key).length).toBeGreaterThan(0);
  });

  test("has the current coins, their earlier versions, the theme series and the commemoratives", () => {
    for (const entry of entries)
      expect(entry.values).toMatchObject({ itemType: "coin", country: "DK" });
    const count = (series: string) =>
      entries.filter((row) => row.values.series === series).length;
    expect(count("Frederik X")).toBe(5);
    expect(count("Margrethe II")).toBe(13);
    expect(count("Christian V's crown")).toBe(1);
    expect(count("Tower coins")).toBe(10);
    expect(count("Fairy tale coins")).toBe(5);
    expect(count("Polar coins")).toBe(3);
    expect(count("Ship coins")).toBe(12);
    expect(count("Science coins")).toBe(4);
    expect(count("Commemorative coins")).toBe(29);
    expect(entries).toHaveLength(82);
  });

  test("gives the 20-krone coin the bank's specifications and portrait artists", () => {
    expect(
      below("dk-20-kroner-margrethe-ii").map((row) => row.values.designers),
    ).toEqual([
      "Hanne Varming",
      "Jan Petersen",
      "Mogens Møller",
      "Lis Nogel",
      "Eva Hjorth",
    ]);
    expect(
      byKey.get("dk-20-kroner-margrethe-ii-1990-hanne-varming")?.values,
    ).toMatchObject({
      title: "20 kroner 1990–1993 – portrait by Hanne Varming",
      yearFrom: 1990,
      yearTo: 1993,
      issueDate: "1990-04-10",
      material: "aluminiumBronze",
      weight: 9.3,
      diameter: 27,
      edge: "interruptedReeding",
      strike: "circulation",
    });
    const frederik = byKey.get("dk-20-kroner-frederik-x-2025")?.values;
    expect(frederik).toMatchObject({
      title: "20 kroner 2025–",
      yearFrom: 2025,
      issueDate: "2025-12",
    });
    expect(frederik?.yearTo).toBeUndefined();
    expect(frederik?.designers).toStartWith("Eva Hjorth");
    const margrethe = byKey.get("dk-5-kroner-margrethe-ii-1990")?.values;
    expect(margrethe).toMatchObject({ title: "5 kroner 1990", yearFrom: 1990 });
    expect(margrethe?.yearTo).toBeUndefined();
    expect(byKey.get("dk-50-ore-crown-1989")?.values).toMatchObject({
      material: "bronze",
      weight: 4.3,
      diameter: 21.5,
      edge: "plain",
      issueDate: "1989-07-03",
    });
  });

  test("titles the theme and commemorative coins with the bank's headings", () => {
    expect(
      byKey.get("dk-20-kroner-towers-2002-arhus-radhustarn")?.values,
    ).toMatchObject({
      title: "20 kroner 2002 – Århus Rådhustårn",
      issueDate: "2002-12-02",
      designers: "Lis Nogel; Mogens Møller",
    });
    const jubilee = below("dk-500-kroner-comm").find(
      (row) => row.values.issueDate === "2022-01-14",
    );
    expect(jubilee?.values).toMatchObject({
      title:
        "500 kroner 2022 – Dronning Margrethe 2.s 50-års regeringsjubilæum",
      material: "silver",
      metal: "silver",
      fineness: 0.999,
      weight: 31.1,
      diameter: 38,
      edge: "plain",
    });
    const millennium = below("dk-200-kroner-comm").find(
      (row) => row.values.issueDate === "1995-09-14",
    );
    expect(millennium?.values.edge).toBe("reeded");
    const fiftieth = below("dk-200-kroner-comm").find(
      (row) => row.values.issueDate === "1990-04-16",
    );
    expect(fiftieth?.values).toMatchObject({
      fineness: 0.8,
      composition: "silver 80%; copper 20%",
    });
    // The page's "8,65,1 g" is no weight.
    expect(below("dk-3000-kroner-comm")[0]?.values.weight).toBeUndefined();
  });

  test("credits every row's facts to Danmarks Nationalbank, its notes to CoinsLite", () => {
    for (const row of file.rows) {
      expect(row.values).toMatchObject({
        factsSource: bank,
        factsAuthor: bank,
        factsLicence: licence,
        notesSource: "CoinsLite editorial, after Danmarks Nationalbank",
        notesAuthor: "CoinsLite",
        notesLicence: "CoinsLite",
      });
      for (const link of [row.values.factsLink, row.values.notesLink])
        expect(link).toStartWith(
          "https://www.nationalbanken.dk/da/vores-arbejde/sedler-og-moenter/",
        );
    }
    for (const entry of entries)
      expect(entry.values.technicalDetails?.length).toBeGreaterThan(0);
  });
});
