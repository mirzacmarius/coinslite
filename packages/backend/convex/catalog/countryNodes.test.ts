import { describe, expect, test } from "bun:test";
import { inBrowseOrder, isCountryNode } from "./countryNodes";

describe("which Catalog nodes are countries", () => {
  test("a country root is one", () => {
    expect(
      isCountryNode({ key: "no", countryNodeKey: "no", country: "NO" }),
    ).toBe(true);
  });

  test("a Theme's country is one", () => {
    expect(
      isCountryNode({
        key: "eur2-de",
        countryNodeKey: "eur2-de",
        country: "DE",
      }),
    ).toBe(true);
  });

  test("a Theme's series, which has no country, is not", () => {
    expect(
      isCountryNode({
        key: "eur-banknotes-first-series",
        countryNodeKey: "eur-banknotes-first-series",
      }),
    ).toBe(false);
  });

  test("a grouping or entry within a country is not", () => {
    expect(
      isCountryNode({ key: "no-1-krone", countryNodeKey: "no", country: "NO" }),
    ).toBe(false);
    expect(isCountryNode({ key: "eur-banknotes" })).toBe(false);
  });
});

describe("the order a node's groupings are browsed in", () => {
  const group = (title: string, entryCount: number, countryNode: boolean) => ({
    title,
    entryCount,
    countryNode,
  });

  test("a Theme's countries: most entries first, equal counts by title", () => {
    expect(
      inBrowseOrder("theme", [
        group("Andorra", 10, true),
        group("Germany", 40, true),
        group("Austria", 10, true),
      ]).map(({ title }) => title),
    ).toEqual(["Germany", "Andorra", "Austria"]);
  });

  test("a Theme's series keep their sort order", () => {
    expect(
      inBrowseOrder("theme", [
        group("First series", 7, false),
        group("Europa series", 9, false),
      ]).map(({ title }) => title),
    ).toEqual(["First series", "Europa series"]);
  });

  test("any other node's groupings keep their sort order", () => {
    expect(
      inBrowseOrder("country", [
        group("Small", 1, false),
        group("Big", 9, false),
      ]).map(({ title }) => title),
    ).toEqual(["Small", "Big"]);
  });
});
