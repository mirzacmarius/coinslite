import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { nationalSides } from "./euro-coin-pages";

const page = readFileSync(
  new URL("./fixtures/ecb-2euro.en.html", import.meta.url),
  "utf8",
);
const sides = nationalSides(page);
const side = (issuer: string) => {
  const found = sides.find((one) => one.issuer === issuer);
  if (!found) throw new Error(`No national side for ${issuer}`);
  return found;
};

describe("nationalSides, reading the ECB's page on one denomination's national sides", () => {
  test("finds the 25 issuers in the page's order", () => {
    expect(sides).toHaveLength(25);
    expect(sides[0]?.issuer).toBe("Andorra");
    expect(sides.at(-1)?.issuer).toBe("Vatican City");
    expect(side("Lithuania").issuer).toBe("Lithuania");
  });

  test("keeps one picture per design series, 38 on the 2-euro page", () => {
    expect(side("Belgium").pictures).toEqual([
      "Belgium_2euroAl.jpg",
      "Belgium_2euro_2008.jpg",
      "Belgium_2euro_2014ph.jpg",
    ]);
    expect(side("Vatican City").pictures).toHaveLength(5);
    expect(sides.flatMap((one) => one.pictures)).toHaveLength(38);
  });

  test("names the issuer's own page", () => {
    expect(side("Monaco").page).toBe("mo");
    expect(side("Estonia").page).toBe("et");
  });

  test("reads the text as plain words", () => {
    expect(side("Austria").text).toBe(
      "Austria chose to produce a series of coins illustrating flowers, architecture and famous people from its history. The designs were chosen by a national panel and public opinion poll. Austrian artist Josef Kaiser created the designs. This coin bears a portrait of the pacifist Bertha von Suttner, a symbol of Austria's efforts over many decades to support peace. Edge lettering of the €2 coin: 2 EURO ***, repeated four times, alternately upright and inverted.",
    );
    expect(side("Andorra").text).toContain(
      'the motto "virtus unita fortior" (virtue united is stronger)',
    );
    expect(side("Belgium").text).toContain(
      "All are valid. The first series depicts King Albert II",
    );
    expect(side("Croatia").text).toContain(
      "Edge lettering of the €2 coin: “O LIJEPA O DRAGA O SLATKA SLOBODO” (“Oh beautiful",
    );
  });

  test("stops at the end of the last issuer's text", () => {
    expect(side("Vatican City").text).toEndWith(
      "Edge lettering of the €2 coin: 2*, repeated six times, alternately upright and inverted.",
    );
  });
});
