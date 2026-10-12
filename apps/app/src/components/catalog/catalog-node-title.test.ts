import { describe, expect, test } from "bun:test";
import { type NodeWords, catalogNodeTitle } from "./catalog-node-title";

/** The words a German reader gets. */
const words: NodeWords = {
  theme: (name) =>
    ({
      euroCommemoratives: "2-Euro-Gedenkmünzen",
      euroBanknotes: "Euro-Banknoten",
    })[name],
  commemorativeCoins: () => "Gedenkmünzen",
  denominationGrouping: (itemType, denomination) =>
    `${denomination}-${itemType === "banknote" ? "Banknoten" : "Münzen"}`,
  country: (code) => ({ DE: "Deutschland", NO: "Norwegen" })[code] ?? code,
};

describe("what a Catalog node is called", () => {
  test("the euro banknotes Theme, in the reader's language", () => {
    expect(
      catalogNodeTitle(
        { key: "eur-banknotes", title: "Euro banknotes", kind: "theme" },
        words,
      ),
    ).toBe("Euro-Banknoten");
  });

  test("the 2-euro commemoratives Theme, in the reader's language", () => {
    expect(
      catalogNodeTitle(
        { key: "eur2-commemoratives", title: "2-euro commemoratives" },
        words,
      ),
    ).toBe("2-Euro-Gedenkmünzen");
  });

  test("a Theme's country, by its name in the reader's language", () => {
    expect(
      catalogNodeTitle(
        {
          key: "eur2-de",
          title: "Germany",
          kind: "grouping",
          country: "DE",
          countryNode: true,
        },
        words,
      ),
    ).toBe("Deutschland");
  });

  test("a Theme's series, which has no country, by its title", () => {
    expect(
      catalogNodeTitle(
        {
          key: "eur-banknotes-europa-series",
          title: "Europa series",
          kind: "grouping",
          countryNode: false,
          series: "Europa series",
          itemType: "banknote",
        },
        words,
      ),
    ).toBe("Europa series");
  });

  test("a grouping within a country, by its title as the Catalog has it", () => {
    expect(
      catalogNodeTitle(
        {
          key: "de-eur-2-euro",
          title: "2 euro",
          kind: "grouping",
          country: "DE",
          countryNode: false,
        },
        words,
      ),
    ).toBe("2 euro");
  });

  test("Norway's denomination groupings and commemoratives, in the reader's language", () => {
    expect(
      catalogNodeTitle(
        {
          key: "no-banknotes-100-kroner",
          title: "100 kroner banknotes",
          kind: "grouping",
          country: "NO",
          countryNode: false,
          denomination: "100 kroner",
          itemType: "banknote",
        },
        words,
      ),
    ).toBe("100 kroner-Banknoten");
    expect(
      catalogNodeTitle(
        { key: "no-comm", title: "Commemorative coins", country: "NO" },
        words,
      ),
    ).toBe("Gedenkmünzen");
  });
});
