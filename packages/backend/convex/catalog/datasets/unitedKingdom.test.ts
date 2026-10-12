import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { unitedKingdom } from "./unitedKingdom";

const file = readCatalogFile(unitedKingdom);
const byKey = new Map(file.rows.map((row) => [row.key, row]));

const kindOfRow = (row: (typeof file.rows)[number]) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const below = (key: string) => file.rows.filter((row) => row.parentKey === key);
const entries = file.rows.filter((row) => row.addable);

describe("the United Kingdom circulating coins dataset", () => {
  test("reads as a Catalog CSV file with no problems", () => {
    expect(file.errors).toEqual([]);
    for (const row of file.rows) {
      expect({
        key: row.key,
        problems: checkNode(row.values, kindOfRow(row)),
      }).toEqual({ key: row.key, problems: [] });
    }
  });

  test("hangs every row from a row in the file, below one United Kingdom root", () => {
    const roots = file.rows.filter((row) => row.parentKey === null);
    expect(roots.map((row) => row.key)).toEqual(["gb"]);
    expect(roots[0]?.values).toMatchObject({
      title: "United Kingdom",
      country: "GB",
    });
    for (const row of file.rows.filter((row) => row.parentKey !== null))
      expect(byKey.has(row.parentKey as string)).toBe(true);
  });

  test("has each circulating decimal denomination, its definitive and commemorative designs", () => {
    expect(below("gb").map((row) => row.values.denomination)).toEqual([
      "1 penny",
      "2 pence",
      "5 pence",
      "10 pence",
      "20 pence",
      "50 pence",
      "1 pound",
      "2 pounds",
    ]);
    for (const denomination of below("gb")) {
      const series = below(denomination.key);
      expect(series.length).toBeGreaterThan(0);
      for (const grouping of series) {
        expect(grouping.values.title).toMatch(
          /^(Definitive designs from \d{4}|Commemorative designs)$/,
        );
        expect(below(grouping.key).length).toBeGreaterThan(0);
      }
    }
    expect(below("gb-50-pence").map((row) => row.values.title)).toContain(
      "Commemorative designs",
    );
    expect(below("gb-1-penny").map((row) => row.values.title)).toContain(
      "Definitive designs from 2023",
    );
  });

  test("describes each design as its proclamation does, circulation strikes with no mintage", () => {
    expect(entries.length).toBeGreaterThan(300);
    for (const entry of entries) {
      expect(entry.values).toMatchObject({
        itemType: "coin",
        country: "GB",
        strike: "circulation",
      });
      expect(entry.values.mintage).toBeUndefined();
      // Every metal the proclamations name has its Catalog material.
      expect(entry.values.material).toBeDefined();
      // The first notice published as data, in 1998, came into force in December 1997.
      expect(entry.values.yearFrom).toBeGreaterThanOrEqual(1997);
      expect(entry.values.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.values.technicalDetails).toContain("Reverse: ");
      expect(entry.values.factsLink).toMatch(
        /^https:\/\/www\.thegazette\.co\.uk\/notice\/[\w-]+$/,
      );
    }
  });

  test("describes the Benjamin Bunny fifty pence of the Beatrix Potter proclamation", () => {
    const bunny = entries.find(
      (row) => row.values.title === "50 pence 2017 – Benjamin Bunny",
    );
    expect(bunny?.parentKey).toBe("gb-50-pence-commemorative");
    expect(bunny?.values).toMatchObject({
      denomination: "50 pence",
      series: "Commemorative designs",
      yearFrom: 2017,
      material: "cupronickel",
      composition: "copper 75%; nickel 25%",
      weight: 8,
      diameter: 27.3,
      edge: "plain",
      issueDate: "2017-02-15",
      historicalNotes:
        "Made to commemorate the life and work of Beatrix Potter.",
      factsLink: "https://www.thegazette.co.uk/notice/2712446",
    });
    expect(bunny?.values.technicalDetails).toBe(
      "Obverse: Our effigy with the inscription “· ELIZABETH II · D · G · REG · F · D · 50 PENCE · 2017”. Reverse: a portrait of Benjamin Bunny with the inscription “BENJAMIN BUNNY”. Metal: cupro-nickel. Shape: equilateral curve heptagon.",
    );
  });

  test("gives the bimetallic two pounds and plated steel coins the metals the Catalog knows", () => {
    const twoPounds = entries.find(
      (row) =>
        row.parentKey === "gb-2-pounds-definitive-2023" &&
        row.values.denomination === "2 pounds",
    );
    expect(twoPounds?.values).toMatchObject({
      material: "bimetallic",
      weight: 12,
      diameter: 28.4,
      edge: "lettered",
      edgeLettering: "IN SERVITIO OMNIUM",
    });
    expect(twoPounds?.values.composition).toBeUndefined();
    expect(twoPounds?.values.technicalDetails).toContain(
      "Metal: cupro-nickel and nickel-brass; inner section copper 75%, nickel 25%; outer section copper 76%, nickel 4%, zinc 20%.",
    );

    const penny = below("gb-1-penny-definitive-2023")[0];
    expect(penny?.values).toMatchObject({ material: "steel", weight: 3.56 });
    expect(penny?.values.composition).toBeUndefined();
    expect(penny?.values.technicalDetails).toContain(
      "Metal: mild steel coated with copper; steel 91%, copper 9%.",
    );
  });

  test("credits every row's facts and notes to The Gazette in full", () => {
    for (const row of file.rows) {
      for (const group of ["facts", "notes"] as const) {
        expect(row.values).toMatchObject({
          [`${group}Source`]: "The Gazette (royal proclamation)",
          [`${group}Author`]: "The Crown",
          [`${group}Licence`]:
            "Contains public sector information licensed under the Open Government Licence v3.0.",
        });
        expect(row.values[`${group}Link`]).toStartWith(
          "https://www.thegazette.co.uk/",
        );
      }
    }
  });
});
