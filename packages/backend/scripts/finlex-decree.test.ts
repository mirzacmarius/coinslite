import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { amended, coinsOf, readDecree } from "./finlex-decree";

const decree = (name: string) =>
  readDecree(
    readFileSync(
      new URL(`./fixtures/finlex-${name}.xml`, import.meta.url),
      "utf8",
    ),
  );

describe("a saved Finlex coin decree", () => {
  test("names the decree and its sections", () => {
    const allardt = decree("2025-288");
    expect(allardt.year).toBe(2025);
    expect(allardt.number).toBe(288);
    expect(allardt.title).toBe(
      "Valtiovarainministeriön asetus Erik Allardt 100 vuotta – yhteiskuntatieteet Suomessa -juhlarahasta",
    );
    expect(allardt.amends).toBeUndefined();
    expect(allardt.sections.map((section) => section.num)).toEqual([
      "1 §",
      "2 §",
      "3 §",
      "4 §",
      "5 §",
      "6 §",
      "7 §",
    ]);
  });

  test("gives the Erik Allardt 20 euro coin's facts", () => {
    const [coin, ...others] = coinsOf(decree("2025-288"));
    expect(others).toEqual([]);
    expect(coin).toMatchObject({
      subject: "Erik Allardt 100 vuotta – yhteiskuntatieteet Suomessa",
      denomination: "20 euro",
      year: 2025,
      strike: "proof",
      material: "silver",
      metal: "silver",
      fineness: 0.925,
      composition: "silver 92.5%; copper 7.5%",
      weight: 25.5,
      diameter: 38.6,
      edge: "plain",
      mint: "Royal Dutch Mint",
    });
    expect(coin?.mintMark).toBeUndefined();
    expect(coin?.variant).toBeUndefined();
    expect(coin?.design).toStartWith(
      "Rahan tunnuspuolen kuva-aiheena on erilaiset geometriset muodot.",
    );
    expect(coin?.design).toEndWith(
      "Arvomerkintä 20 € on rahan keskilinjan oikealla puolella, kuva-aiheen alareunassa.",
    );
  });

  test("gives each coin of a decree that issues two denominations its own facts", () => {
    const coins = coinsOf(decree("2014-48"));
    expect(coins.map((coin) => coin.denomination)).toEqual([
      "20 euro",
      "10 euro",
    ]);
    const [twenty, ten] = coins;
    const shared = {
      subject: "Tove Jansson",
      year: 2014,
      material: "silver",
      metal: "silver",
      mint: "Suomen Rahapaja Oy",
    };
    expect(twenty).toMatchObject({
      ...shared,
      fineness: 0.925,
      composition: "silver 92.5%; copper 7.5%",
      weight: 25.5,
      diameter: 38.6,
    });
    expect(ten).toMatchObject({
      ...shared,
      fineness: 0.5,
      composition: "silver 50%; copper 50%",
      weight: 10,
      diameter: 28.5,
    });
    // Only some are struck as proofs, and the decree gives no edge.
    for (const coin of coins) {
      expect(coin.strike).toBeUndefined();
      expect(coin.edge).toBeUndefined();
      expect(coin.design).toStartWith(
        "Rahojen tunnuspuolen keskellä on Tove Janssonin kasvokuva",
      );
    }
  });

  test("gives a proof struck in another alloy as a coin of its own", () => {
    const coins = coinsOf(decree("2011-959"));
    expect(coins).toHaveLength(2);
    const [regular, proof] = coins;
    const shared = {
      subject: "Juhani Aho ja suomalainen kirjallisuus",
      denomination: "10 euro",
      year: 2011,
      weight: 25.5,
      diameter: 38.6,
      mint: "Suomen Rahapaja Oy",
    };
    expect(regular).toMatchObject({ ...shared, fineness: 0.5 });
    expect(regular?.strike).toBeUndefined();
    expect(regular?.variant).toBeUndefined();
    expect(proof).toMatchObject({
      ...shared,
      fineness: 0.925,
      strike: "proof",
      variant: "proof",
    });
  });

  test("reads a markka coin of 1989 with lettering on its edge", () => {
    const [coin] = coinsOf(decree("1988-1133"));
    expect(coin).toMatchObject({
      subject:
        "Lahdessa vuonna 1989 pidettävien hiihdon maailmanmestaruuskilpailujen johdosta lyötävä juhlaraha",
      denomination: "100 markkaa",
      year: 1989,
      material: "silver",
      fineness: 0.83,
      composition: "silver 83%; copper 17%",
      weight: 24,
      diameter: 35,
      edge: "lettered",
      edgeLettering: "MM-KISAT LAHDESSA VM-TÄVLINGEN I LAHTIS",
      mint: "Suomen Rahapaja",
    });
    // The decree allows the initials without giving them, and only some may be proofs.
    expect(coin?.mintMark).toBeUndefined();
    expect(coin?.strike).toBeUndefined();
    expect(coin?.design).toBe(
      'Rahan tunnuspuolella on naishiihtäjä ja vuosiluku "1989" sekä sanat "SUOMI" ja "FINLAND". Rahan arvopuolella on näkymä Lahden hiihtostadionista kolmine hyppyrimäkineen ja teksti "100 MK".',
    );
  });

  test("applies an amending decree's sections to the decree it amends", () => {
    const amendment = decree("2025-107");
    expect(amendment.amends).toEqual({ year: 2025, number: 58 });
    const veterans = amended(decree("2025-58"), [amendment]);
    expect(
      veterans.sections.find((section) => section.num === "2 §")?.paragraphs,
    ).toEqual(amendment.sections[0]?.paragraphs);
    const [coin, ...others] = coinsOf(veterans);
    expect(others).toEqual([]);
    expect(coin).toMatchObject({
      subject: "Suomen veteraanit",
      denomination: "50 euro",
      year: 2025,
      material: "bimetallic",
      weight: 12.8,
      diameter: 27.25,
      edge: "plain",
      strike: "proof",
      mint: "Royal Dutch Mint",
    });
    // Two precious alloys: no one metal or fineness.
    expect(coin?.metal).toBeUndefined();
    expect(coin?.fineness).toBeUndefined();
    expect(coin?.composition).toBeUndefined();
  });
});
