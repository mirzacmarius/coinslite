import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { type Proclamation, parseNotice } from "./gazette-proclamation";

// The fixtures are notices saved from The Gazette (data.xml). Contains public
// sector information licensed under the Open Government Licence v3.0.
const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const only = (name: string) => {
  const proclamations = parseNotice(fixture(name));
  expect(proclamations).toHaveLength(1);
  return proclamations[0] as Proclamation;
};
const descriptions = (proclamation: Proclamation, design: number) =>
  proclamation.designs[design]?.reverses.map((reverse) => reverse.description);

describe("a saved royal proclamation from The Gazette", () => {
  test("gives the Beatrix Potter fifty pence coins, their designs and dates", () => {
    const proclamation = only("gazette-2712446.xml");

    expect(proclamation).toMatchObject({
      notice: "2712446",
      edition: "London",
      title:
        "DETERMINING THE SPECIFICATIONS AND DESIGNS FOR FIFTY PENCE COINS COMMEMORATING THE LIFE AND WORK OF BEATRIX POTTER",
      published: "2017-02-17",
      given: "2017-02-15",
      inForce: "2017-02-16",
      commemorative: true,
      occasion: "to commemorate the life and work of Beatrix Potter",
    });
    expect(proclamation.coins).toEqual([
      {
        denomination: "50 pence",
        metal: "silver",
        weight: 8,
        diameter: 27.3,
        composition: [{ metal: "silver", percent: 92.5 }],
        shape: "equilateral curve heptagon",
        design: 0,
      },
      {
        denomination: "50 pence",
        metal: "cupro-nickel",
        weight: 8,
        diameter: 27.3,
        composition: [
          { metal: "copper", percent: 75 },
          { metal: "nickel", percent: 25 },
        ],
        shape: "equilateral curve heptagon",
        design: 0,
      },
    ]);
    expect(proclamation.designs).toHaveLength(1);
    const [design] = proclamation.designs;
    expect(design?.obverse).toBe(
      "Our effigy with the inscription “· ELIZABETH II · D · G · REG · F · D · 50 PENCE · 2017”",
    );
    expect(descriptions(proclamation, 0)).toEqual([
      "a portrait of Benjamin Bunny with the inscription “BENJAMIN BUNNY”",
      "a portrait of Mr Jeremy Fisher with the inscription “MR JEREMY FISHER”",
      "a portrait of Tom Kitten with the inscription “TOM KITTEN”",
      "a depiction of Peter Rabbit running with the inscription “THE TALE OF PETER RABBIT”",
    ]);
    expect(design?.edge).toEqual({ edge: "plain" });
    expect(design?.text).toStartWith(
      "For the obverse impression either Our effigy with the inscription",
    );
    expect(design?.text).toEndWith("The coins shall have a plain edge.");
  });

  test("reads a new series of every denomination, with the bimetallic two pounds and plated steel coins", () => {
    const proclamation = only("gazette-4456074.xml");

    expect(proclamation).toMatchObject({
      notice: "4456074",
      given: "2023-10-11",
      inForce: "2023-10-12",
      commemorative: false,
    });
    expect(proclamation.occasion).toBeUndefined();
    // Gold, two silvers and platinum, then the base metal coin, for each of
    // eight denominations.
    expect(proclamation.coins).toHaveLength(8 * 5);
    expect(proclamation.designs).toHaveLength(8);

    const twoPounds = proclamation.coins.find(
      (coin) => coin.metal === "cupro-nickel and nickel-brass",
    );
    expect(twoPounds).toEqual({
      denomination: "2 pounds",
      metal: "cupro-nickel and nickel-brass",
      weight: 12,
      diameter: 28.4,
      sections: {
        inner: [
          { metal: "copper", percent: 75 },
          { metal: "nickel", percent: 25 },
        ],
        outer: [
          { metal: "copper", percent: 76 },
          { metal: "nickel", percent: 4 },
          { metal: "zinc", percent: 20 },
        ],
      },
      shape: "circular",
      design: 0,
    });
    expect(proclamation.designs[0]?.edge).toEqual({
      edge: "lettered",
      lettering: "IN SERVITIO OMNIUM",
    });
    expect(descriptions(proclamation, 0)).toEqual([
      "a depiction of the floral symbol of the United Kingdom; thistle, rose, daffodil and clover, with the inscription “2 POUNDS” with a background of three interlocking C’s repeated",
    ]);

    const onePound = proclamation.coins.find(
      (coin) => coin.metal === "nickel-brass",
    );
    expect(onePound).toMatchObject({
      denomination: "1 pound",
      weight: 8.75,
      diameter: 23.03,
      composition: [
        { metal: "copper", percent: 76 },
        { metal: "nickel", percent: 4 },
        { metal: "zinc", percent: 20 },
      ],
      shape: "twelve sided",
      design: 1,
    });
    expect(proclamation.designs[1]?.edge).toEqual({
      edge: "interruptedReeding",
    });

    const tenPence = proclamation.coins.find(
      (coin) =>
        coin.denomination === "10 pence" &&
        coin.metal === "mild steel coated with nickel",
    );
    expect(tenPence).toEqual({
      denomination: "10 pence",
      metal: "mild steel coated with nickel",
      weight: 6.5,
      diameter: 24.5,
      composition: [
        { metal: "steel", percent: 94 },
        { metal: "nickel", percent: 6 },
      ],
      shape: "circular",
      design: 4,
    });
    expect(proclamation.designs[4]?.edge).toEqual({ edge: "reeded" });
    expect(descriptions(proclamation, 7)).toEqual([
      "a depiction of a dormouse with the inscription “1 PENNY” set against a background of three interlocking C’s repeated",
    ]);
  });

  test("keeps a reverse the proclamation allows only on some coins apart, and reads numbered options", () => {
    const proclamation = only("gazette-2929909.xml");

    expect(proclamation.coins.map((coin) => coin.metal)).toEqual([
      "gold",
      "silver",
      "cupro-nickel",
    ]);
    expect(proclamation.designs).toHaveLength(1);
    expect(proclamation.designs[0]?.reverses).toEqual([
      {
        description:
          "a depiction of Mrs Tittlemouse with the inscription “MRS TITTLEMOUSE”",
      },
      {
        description:
          "a depiction of the Tailor of Gloucester with the inscription “THE TAILOR OF GLOUCESTER”",
      },
      {
        description:
          "a depiction of Flopsy Bunny with the inscription “FLOPSY BUNNY”",
      },
      {
        description:
          "a depiction of Peter Rabbit with the inscription “PETER RABBIT”",
      },
      {
        description:
          "an interpretation of elements of Newton’s Proposition 11 from Book One of Principia Mathematica, accompanied by the inscription “SIR ISAAC NEWTON” and the denomination “FIFTY PENCE”",
        onlyFor: "cupro-nickel coins",
        // Its option restates the obverse, with the date the coin bears.
        obverse:
          "Our effigy with the inscription “· ELIZABETH II · DEI · GRA · REG · FID · DEF · 2018”",
      },
    ]);
  });

  test("reads which proclamation an altering one alters and the words it changes", () => {
    const proclamation = only("gazette-3450928.xml");

    expect(proclamation).toMatchObject({
      given: "2019-12-17",
      alters: ["2019-10-08"],
      substitutions: [{ from: "31 October 2019", to: "31 January 2020" }],
      coins: [],
      designs: [],
    });
  });

  test("reads each of the proclamations an early notice prints together", () => {
    const proclamations = parseNotice(fixture("gazette-L-57484-1004.xml"));

    expect(proclamations.map((proclamation) => proclamation.title)).toEqual([
      "DETERMINING THE SPECIFICATIONS AND DESIGN FOR FIVE-POUND COINS TO COMMEMORATE THE TWO-HUNDREDTH ANNIVERSARY OF THE BATTLE OF TRAFALGAR & THE DEATH OF LORD NELSON",
      "DETERMINING THE SPECIFICATIONS AND DESIGN FOR ONE HUNDRED-POUND, FIFTY-POUND, TWENTY-FIVE-POUND, AND TEN-POUND GOLD COINS; AND TWO-POUND, ONE POUND, FIFTY-PENCE AND TWENTY PENCE SILVER COINS",
      "DETERMINING THE SPECIFICATIONS AND DESIGN FOR FIFTY PENCE COINS COMMEMORATING THE TWO-HUNDRED-AND-FIFTIETH ANNIVERSARY OF SAMUEL JOHNSON’S DICTIONARY OF THE ENGLISH LANGUAGE",
      "DETERMINING THE SPECIFICATIONS AND DESIGN FOR TWO-POUND COINS COMMEMORATING THE FOUR-HUNDREDTH ANNIVERSARY OF THE GUNPOWDER PLOT",
      "ALTERING THE PROCLAMATION OF THE 4TH DAY OF OCTOBER 1953 DETERMINING THE NEW DESIGNS FOR GOLD, SILVER, CUPRO-NICKEL, MIXED METAL AND BRONZE COINS",
    ]);
    const [, , johnson, gunpowder] = proclamations as Proclamation[];
    expect(johnson).toMatchObject({
      notice: "L-57484-1004",
      given: "2004-11-17",
      inForce: "2004-11-18",
    });
    expect(johnson?.coins.at(-1)).toMatchObject({
      denomination: "50 pence",
      metal: "cupro-nickel",
      weight: 8,
      diameter: 27.3,
    });
    // It says nothing of the edge.
    expect(johnson?.designs[0]).toMatchObject({
      obverse:
        "Our effigy with the inscription ‘ELIZABETH . II . D . G REG . F . D.’, and the date of the year",
      reverses: [
        {
          description:
            "entries from the Dictionary for the words FIFTY and PENCE, with the figure 50 above, and the inscription JOHNSON’S DICTIONARY 1755 below",
        },
      ],
    });
    expect(johnson?.designs[0]?.edge).toBeUndefined();
    // "come into force on the eighteenth of November", with no "day".
    expect(gunpowder?.inForce).toBe("2004-11-18");
    expect(gunpowder?.designs[0]?.edge).toEqual({
      edge: "lettered",
      lettering: "REMEMBER REMEMBER THE FIFTH OF NOVEMBER",
    });
  });

  test("gives each reverse its own edge where the proclamation does", () => {
    const proclamation = only("gazette-3892778.xml");
    const twoPounds = proclamation.coins.find(
      (coin) => coin.metal === "cupro-nickel and nickel-brass",
    );
    const design = proclamation.designs[twoPounds?.design ?? -1];

    expect(design?.edge).toBeUndefined();
    expect(design?.reverses).toEqual([
      {
        description:
          "a portrait of Dame Vera Lynn with the inscription “DAME VERA LYNN 1917 - 2020”",
        edge: { edge: "lettered", lettering: "WE’LL MEET AGAIN" },
      },
      {
        description:
          "a depiction of the FA Cup with the inscription “CELEBRATING 150 YEARS OF THE FA CUP”",
        edge: {
          edge: "lettered",
          lettering: "FOOTBALL’S GREATEST CUP COMPETITION",
        },
      },
      {
        description:
          "a depiction of a numbered telephone keypad and the dates “1847” and “1922” with the inscription “ALEXANDER GRAHAM BELL”",
        edge: { edge: "lettered", lettering: "INNOVATION IN SCIENCE · BELL" },
      },
    ]);
  });
});
