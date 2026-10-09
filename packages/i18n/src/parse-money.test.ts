import { describe, expect, test } from "vitest";
import { formatMoney, parseMoney } from "./index";

describe("parseMoney", () => {
  test("reads an amount typed in each language's own way, as minor units", () => {
    expect(parseMoney("1,234.56", "en")).toBe(123456);
    expect(parseMoney("1 234,56", "nb")).toBe(123456);
    expect(parseMoney("1.234,56", "de")).toBe(123456);
    expect(parseMoney("1 234,56", "fr")).toBe(123456);
    expect(parseMoney("1.234,56", "ro")).toBe(123456);
  });

  test("accepts whole amounts, one decimal, and either decimal mark when unambiguous", () => {
    expect(parseMoney("75", "en")).toBe(7500);
    expect(parseMoney("75.5", "en")).toBe(7550);
    expect(parseMoney("75,5", "nb")).toBe(7550);
    expect(parseMoney("  75.50 ", "nb")).toBe(7550);
    expect(parseMoney("0", "en")).toBe(0);
  });

  test("reads back what formatMoney shows, without the currency", () => {
    for (const locale of ["en", "nb", "de", "fr", "ro"] as const) {
      const shown = formatMoney(123456, "EUR", locale).replace(
        /[^\d.,\s  ]/g,
        "",
      );
      expect(parseMoney(shown, locale)).toBe(123456);
    }
  });

  test("refuses what isn't an amount", () => {
    for (const text of ["", "abc", "-5", "1.2.3", "75.555", "1e5", "12,34,5"]) {
      expect(parseMoney(text, "en"), text).toBeNull();
    }
  });
});
