import { describe, expect, test } from "vitest";
import {
  formatCountry,
  formatDate,
  formatMoney,
  formatNumber,
  homeCurrencies,
} from "./index";

// Intl uses non-breaking (and narrow non-breaking) spaces as group separators.
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatMoney", () => {
  test("covers the eight Home currencies", () => {
    expect(homeCurrencies).toEqual([
      "NOK",
      "SEK",
      "DKK",
      "EUR",
      "RON",
      "GBP",
      "USD",
      "CHF",
    ]);
  });

  test("formats minor units in the active language's conventions", () => {
    expect(plain(formatMoney(123456, "NOK", "nb"))).toBe("1 234,56 kr");
    expect(plain(formatMoney(123456, "EUR", "de"))).toBe("1.234,56 €");
    expect(plain(formatMoney(123456, "USD", "en"))).toBe("$1,234.56");
    expect(plain(formatMoney(123456, "RON", "ro"))).toBe("1.234,56 RON");
    expect(plain(formatMoney(123456, "CHF", "fr"))).toBe("1 234,56 CHF");
  });

  test("keeps cents exact for small amounts", () => {
    expect(formatMoney(5, "EUR", "en")).toBe("€0.05");
  });

  test("rejects amounts that aren't whole minor units", () => {
    expect(() => formatMoney(1.5, "EUR", "en")).toThrow();
  });
});

describe("formatNumber", () => {
  test("uses the active language's separators", () => {
    expect(plain(formatNumber(1234.5, "en"))).toBe("1,234.5");
    expect(plain(formatNumber(1234.5, "de"))).toBe("1.234,5");
    expect(plain(formatNumber(1234.5, "nb"))).toBe("1 234,5");
  });
});

describe("formatDate", () => {
  test("formats a calendar date without shifting it across time zones", () => {
    expect(formatDate("2026-10-08", "en")).toBe("Oct 8, 2026");
    expect(formatDate("2026-10-08", "de")).toBe("08.10.2026");
    expect(formatDate("2026-10-08", "nb")).toBe("8. okt. 2026");
  });

  test("accepts timestamps", () => {
    expect(formatDate(Date.UTC(2026, 9, 8, 23, 30), "fr")).toBe("8 oct. 2026");
  });
});

describe("formatCountry", () => {
  test("shows an ISO country code as a translated name", () => {
    expect(formatCountry("NO", "de")).toBe("Norwegen");
    expect(formatCountry("RO", "fr")).toBe("Roumanie");
    expect(formatCountry("DE", "nb")).toBe("Tyskland");
    expect(formatCountry("no", "ro")).toBe("Norvegia");
  });

  test("falls back to the code itself for anything that isn't a country", () => {
    expect(formatCountry("XX", "en")).toBe("XX");
    expect(formatCountry("norway", "en")).toBe("norway");
  });
});
