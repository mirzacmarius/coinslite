import { describe, expect, test } from "bun:test";
import { checkNode, kindOf, readCatalogFile } from "../fields";
import { unitedKingdom } from "./unitedKingdom";
import { ukScannedCoinDesigns } from "./unitedKingdomScannedCoins";

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
const ogl =
  "Contains public sector information licensed under the Open Government Licence v3.0.";
/** A page of The Gazette, as data since 1998 or as a scanned page before. */
const gazetteLink =
  /^https:\/\/www\.thegazette\.co\.uk\/(?:notice\/[\w-]+|London\/issue\/\d+\/page\/\d+)$/;
const scannedPage =
  /^https:\/\/www\.thegazette\.co\.uk\/London\/issue\/\d+\/page\/\d+$/;
const decimalCurrencyAct =
  "https://www.legislation.gov.uk/ukpga/1967/47/enacted";
const byTitle = (title: string) =>
  entries.find((row) => row.values.title === title);

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
      "½ penny",
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
      // The first decimal coins were proclaimed in February 1968.
      expect(entry.values.yearFrom).toBeGreaterThanOrEqual(1968);
      expect(entry.values.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.values.technicalDetails).toContain("Reverse: ");
      expect(entry.values.notesLink).toMatch(gazetteLink);
      if (entry.values.factsLink !== decimalCurrencyAct)
        expect(entry.values.factsLink).toMatch(gazetteLink);
      // Every coin has the weight and diameter its sources give.
      expect(entry.values.weight).toBeGreaterThan(0);
      expect(entry.values.diameter).toBeGreaterThan(0);
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

  test("titles a design with the date its coin bears, or with none where its proclamation gives none", () => {
    const titles = entries.map((row) => row.values.title);
    // "for ‘31 October 2019’ there shall be substituted ‘31 January 2020’"
    // (notice 3450928) is applied.
    const brexit = entries.find(
      (row) =>
        row.values.factsLink === "https://www.thegazette.co.uk/notice/3402773",
    );
    expect(brexit?.values).toMatchObject({
      title:
        "50 pence 2020 – “PEACE, PROSPERITY AND FRIENDSHIP WITH ALL NATIONS”",
      yearFrom: 2020,
    });
    expect(brexit?.values.technicalDetails).toContain("31 January 2020");
    // "and the date of the year": the year the proclamation came into force,
    // and no year in the title.
    expect(titles).toContain("1 penny – Dormouse");
    expect(below("gb-1-penny-definitive-2023")[0]?.values.yearFrom).toBe(2023);
    // The Newton 50p's "2018" was altered to "the date of the year" (notice 3204632).
    const newton = entries.find(
      (row) =>
        row.values.factsLink ===
          "https://www.thegazette.co.uk/notice/2929909" &&
        String(row.values.title).includes("Newton"),
    );
    expect(newton?.values.title).toStartWith("50 pence – ");
    expect(newton?.values.technicalDetails).not.toContain("2018");
    for (const title of titles)
      expect(title).toMatch(/^(?:\d+|½) (?:penny|pence|pounds?)(?: \d{4})? – /);
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

  test("credits every row's facts and notes in full: to The Gazette, or the first coins' facts to the Decimal Currency Act 1967", () => {
    for (const row of file.rows) {
      const act = row.values.factsLink === decimalCurrencyAct;
      expect(row.values).toMatchObject({
        factsSource: act
          ? "legislation.gov.uk (Decimal Currency Act 1967, Schedule 1)"
          : "The Gazette (royal proclamation)",
        factsAuthor: "The Crown",
        factsLicence: ogl,
        notesSource: "The Gazette (royal proclamation)",
        notesAuthor: "The Crown",
        notesLicence: ogl,
      });
      if (!act)
        expect(row.values.factsLink).toStartWith(
          "https://www.thegazette.co.uk/",
        );
      expect(row.values.notesLink).toStartWith("https://www.thegazette.co.uk/");
    }
  });

  test("has a row for every design transcribed from the scanned proclamations of 1968 to 1997, credited to its page", () => {
    const scanned = entries.filter((row) =>
      scannedPage.test(String(row.values.notesLink)),
    );
    expect(scanned).toHaveLength(ukScannedCoinDesigns.length);
    for (const row of scanned) {
      expect(row.values.yearFrom).toBeLessThanOrEqual(1997);
      expect(String(row.values.issueDate) < "1997-12-17").toBe(true);
    }
    // The first decimal coins: designs from the proclamation of 14 February
    // 1968, weights, diameters and compositions from the Act.
    const tenNewPence = byTitle(
      "10 pence – Lion passant guardant royally crowned",
    );
    expect(tenNewPence?.parentKey).toBe("gb-10-pence-definitive-1968");
    expect(tenNewPence?.values).toMatchObject({
      yearFrom: 1968,
      material: "cupronickel",
      composition: "copper 75%; nickel 25%",
      weight: 11.31036,
      diameter: 28.5,
      edge: "reeded",
      issueDate: "1968-02-14",
      factsLink: decimalCurrencyAct,
      notesLink: "https://www.thegazette.co.uk/London/issue/44527/page/1947",
    });
    expect(tenNewPence?.values.technicalDetails).toContain(
      "Reverse: a lion passant guardant royally crowned, being part of the crest of England, and the inscription “10 NEW PENCE”.",
    );
    // The bronze coins bear "the date 1971, or of a succeeding year".
    const halfpenny = below("gb-half-penny-definitive-1968")[0];
    expect(halfpenny?.values).toMatchObject({
      title: "½ penny – The Royal Crown",
      denomination: "½ penny",
      yearFrom: 1971,
      material: "bronze",
      weight: 1.782,
      diameter: 17.145,
      edge: "plain",
      factsLink: decimalCurrencyAct,
    });
    // The Act gives bronze no shares of its metals, so none is given.
    expect(halfpenny?.values.composition).toBeUndefined();
    // A design on one page whose specification is on the page before.
    expect(byTitle("50 pence – Figure of Britannia")?.values).toMatchObject({
      weight: 13.5,
      diameter: 30,
      factsLink: "https://www.thegazette.co.uk/London/issue/44749/page/13765",
      notesLink: "https://www.thegazette.co.uk/London/issue/44749/page/13766",
    });
    // An altering proclamation's new reverse: the coin of 20 April 1983.
    expect(
      byTitle(
        "1 pound – Thistle eradicated enfiling a representation of Our Royal Diadem",
      )?.values,
    ).toMatchObject({
      yearFrom: 1983,
      material: "nickelBrass",
      composition: "copper 70%; nickel 5.5%; zinc 24.5%",
      weight: 9.5,
      diameter: 22.5,
      edge: "lettered",
      edgeLettering: "NEMO ME IMPUNE LACESSIT",
      issueDate: "1983-06-22",
      factsLink: "https://www.thegazette.co.uk/London/issue/49328/page/5509",
      notesLink: "https://www.thegazette.co.uk/London/issue/49397/page/8379",
    });
    // A commemorative whose proclamation fixes the date on the coin.
    expect(
      byTitle("2 pounds 1986 – St. Andrew’s cross and a Thistle of Scotland")
        ?.values,
    ).toMatchObject({
      yearFrom: 1986,
      weight: 15.976,
      diameter: 28.4,
      edgeLettering: "XIII COMMONWEALTH GAMES SCOTLAND 1986",
      historicalNotes:
        "Made to commemorate the XIII Commonwealth Games, to be held in Scotland in the year One thousand nine hundred and eighty-six.",
    });
  });
});
