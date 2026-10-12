import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { coinFacts, parseCoinIssue } from "./bnr-page";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("a coin issue's page", () => {
  test("gives its title, date and each piece's facts", () => {
    const issue = parseCoinIssue(fixture("bnr-25745-tonitza.html"));
    expect(issue.title).toBe("„Pictori români” – Nicolae Tonitza");
    expect(issue.date).toBe("2026-08-24");
    expect(issue.pieces).toHaveLength(1);
    const [piece] = issue.pieces;
    expect(piece?.lines).toEqual([
      "Valoare nominală: 10 lei;",
      "Metal: Argint 999/1000;",
      "Greutate: 31.103 grame;",
      "Dimensiune: dreptunghiulară - 43x31 mm;",
      "Margine: zimțată;",
      "Calitate: proof;",
      "Tiraj maxim: 500.",
    ]);
    expect(piece?.obverse).toStartWith("Avers: redă o imagine color");
    expect(piece?.reverse).toBe(
      "Revers: prezintă portretul, numele pictorului Nicolae Tonitza și anii între care a trăit acesta „1886-1940”.",
    );
    expect(coinFacts(piece!)).toEqual({
      denomination: "10 lei",
      material: "silver",
      metal: "silver",
      fineness: 0.999,
      weight: 31.103,
      edge: "reeded",
      strike: "proof",
    });
  });

  test("takes a bare nominal value's unit from the obverse's inscription, and leaves out what is broken", () => {
    const piece = {
      heading: "Argint",
      lines: [
        "Valoare nominală: 10;",
        "Metal: Argint 9999/1000;",
        "Greutate: 31103 grame;",
        "Calitate: [##1105##];",
      ],
      obverse:
        "Avers: inscripţia „ROMANIA”, valoarea nominală „10 LEI” și anul de emisiune „2017”.",
    };
    expect(coinFacts(piece)).toEqual({
      denomination: "10 lei",
      material: "silver",
      metal: "silver",
    });
    expect(coinFacts({ ...piece, lines: ["Valoare nominală: -;"] })).toEqual(
      {},
    );
  });

  test("gives each piece of a set its own facts", () => {
    const issue = parseCoinIssue(fixture("bnr-22626-fao-set.html"));
    expect(issue.title).toBe("Conferinţa mondială F.A.O. Roma 1996 - set");
    expect(issue.date).toBe("1996-11-11");
    expect(issue.pieces.map(coinFacts)).toEqual([
      {
        denomination: "100 lei",
        material: "silver",
        metal: "silver",
        fineness: 0.925,
        weight: 27.5,
        diameter: 37,
        edge: "plain",
        strike: "proof",
      },
      {
        denomination: "10 lei",
        material: "steel",
        weight: 4.65,
        diameter: 23,
        edge: "plain",
        strike: "bu",
      },
    ]);
  });
});
