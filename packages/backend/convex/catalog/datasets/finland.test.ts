import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { euroCirculationCoins } from "./euroCirculationCoins";
import { finland } from "./finland";
import { finlandCollectorCoins } from "./finlandCollectorCoins";

const file = readCatalogFile(finland);
const byKey = new Map(file.rows.map((row) => [row.key, row]));
const euroKeys = readCatalogFile(euroCirculationCoins).rows.map(
  (row) => row.key,
);

const kindOfRow = (row: (typeof file.rows)[number]) =>
  kindOf({
    parentKey: row.parentKey ?? null,
    country: row.values.country,
    addable: row.addable ?? false,
  });
const entries = file.rows.filter((row) => row.addable);
const decreeLink = (year: number, number: number) =>
  `https://www.finlex.fi/fi/lainsaadanto/saadoskokoelma/${year}/${number}`;

describe("the Finland collector coins dataset", () => {
  test("reads as a Catalog CSV file with no problems", () => {
    expect(file.errors).toEqual([]);
    for (const row of file.rows) {
      expect({
        key: row.key,
        problems: checkNode(row.values, kindOfRow(row)),
      }).toEqual({ key: row.key, problems: [] });
    }
  });

  test("hangs the collector coins from the existing Finland root without touching its keys", () => {
    expect(euroKeys).toContain("fi");
    expect(byKey.has("fi")).toBe(false);
    for (const row of file.rows) {
      const parent = row.parentKey as string;
      expect(parent === "fi" || byKey.has(parent)).toBe(true);
      expect(euroKeys).not.toContain(row.key);
    }
    const top = file.rows.filter((row) => row.parentKey === "fi");
    expect(top.map((row) => row.values.title)).toEqual(["Collector coins"]);
    // After the eight euro circulation denominations.
    expect(top[0]?.values.sortOrder).toBe(9);
  });

  test("groups the coins by denomination, euro before markka, highest first", () => {
    expect(
      file.rows
        .filter((row) => row.parentKey === "fi-collector-coins")
        .map((row) => row.values.title),
    ).toEqual([
      "100 euro",
      "50 euro",
      "20 euro",
      "10 euro",
      "5 euro",
      "2000 markkaa",
      "100 markkaa",
      "25 markkaa",
      "10 markkaa",
    ]);
  });

  test("has one entry per coin the decrees issue, from 1989 to 2026", () => {
    expect(entries).toHaveLength(finlandCollectorCoins.length);
    expect(entries).toHaveLength(138);
    const decrees = new Set(
      finlandCollectorCoins.map(
        (coin) => `${coin.decreeNumber}/${coin.decreeYear}`,
      ),
    );
    expect(decrees.size).toBe(117);
    const years = entries.map((row) => row.values.yearFrom as number);
    expect(Math.min(...years)).toBe(1989);
    expect(Math.max(...years)).toBe(2026);
    for (const row of entries) {
      expect(row.values).toMatchObject({
        itemType: "coin",
        country: "FI",
        series: "Collector coins",
        notesLanguage: "fi",
      });
      expect(row.values.yearTo).toBe(row.values.yearFrom as number);
      expect(row.values.technicalDetails?.length).toBeGreaterThan(0);
      // Decrees give designers by initial only, and no initial is expanded.
      expect(row.values.designers).toBeUndefined();
    }
  });

  test("describes the Erik Allardt 20 euro coin as decree 288/2025 gives it", () => {
    const allardt = byKey.get("fi-collector-2025-288-20-euro");
    expect(allardt?.parentKey).toBe("fi-collector-coins-20-euro");
    expect(allardt?.values).toMatchObject({
      title: "Erik Allardt 100 vuotta – yhteiskuntatieteet Suomessa",
      denomination: "20 euro",
      yearFrom: 2025,
      strike: "proof",
      material: "silver",
      metal: "silver",
      fineness: 0.925,
      composition: "silver 92.5%; copper 7.5%",
      weight: 25.5,
      diameter: 38.6,
      edge: "plain",
      mint: "Royal Dutch Mint",
      factsLink: decreeLink(2025, 288),
    });
    expect(allardt?.values.technicalDetails).toStartWith(
      "Rahan tunnuspuolen kuva-aiheena on erilaiset geometriset muodot.",
    );
  });

  test("gives a decree's second coin of one denomination an entry of its own", () => {
    expect(byKey.get("fi-collector-2011-959-10-euro")?.values).toMatchObject({
      title: "Juhani Aho ja suomalainen kirjallisuus",
      fineness: 0.5,
    });
    expect(
      byKey.get("fi-collector-2011-959-10-euro-proof")?.values,
    ).toMatchObject({
      title: "Juhani Aho ja suomalainen kirjallisuus, erikoislyöntinen",
      fineness: 0.925,
      strike: "proof",
    });
    expect(
      byKey.get("fi-collector-1995-1265-10-markkaa-gold-and-silver")?.values,
    ).toMatchObject({
      title: "EU-juhlaraha, kulta- ja hopeaseosta",
      material: "bimetallic",
      weight: 12.2,
    });
  });

  test("credits every row's facts and notes to Finlex under CC BY 4.0, entries to their decree", () => {
    for (const row of file.rows) {
      for (const group of ["facts", "notes"] as const) {
        expect(row.values).toMatchObject({
          [`${group}Source`]: "Finlex",
          [`${group}Author`]:
            "Valtiovarainministeriö (Ministry of Finance of Finland)",
          [`${group}Licence`]:
            "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes by CoinsLite: arranged into Catalog fields.",
        });
        expect(row.values[`${group}Link`]).toMatch(
          /^https:\/\/www\.finlex\.fi\//,
        );
      }
    }
    for (const coin of finlandCollectorCoins) {
      const links = entries
        .filter((row) =>
          row.key.startsWith(
            `fi-collector-${coin.decreeYear}-${coin.decreeNumber}-`,
          ),
        )
        .map((row) => row.values.factsLink);
      expect(links.length).toBeGreaterThan(0);
      for (const link of links)
        expect(link).toBe(decreeLink(coin.decreeYear, coin.decreeNumber));
    }
  });
});
