import { describe, expect, test } from "vitest";
import {
  formatCountry,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formattersFor,
  homeCurrencies,
} from "./index";

// Intl uses non-breaking (and narrow non-breaking) spaces as group separators.
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("Home currencies", () => {
  test("are the eight launch currencies", () => {
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
});

describe("formatMoney", () => {
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

  test("shows a moment in the viewer's time zone", () => {
    const lateEveningUtc = Date.UTC(2026, 9, 8, 23, 30);
    expect(formatDate(lateEveningUtc, "fr", { timeZone: "UTC" })).toBe(
      "8 oct. 2026",
    );
    expect(formatDate(lateEveningUtc, "fr", { timeZone: "Europe/Paris" })).toBe(
      "9 oct. 2026",
    );
  });

  test("rejects strings that aren't calendar dates", () => {
    expect(() => formatDate("2026-10-08T12:00:00Z", "en")).toThrow(RangeError);
    expect(() => formatDate("8 Oct 2026", "en")).toThrow(RangeError);
  });
});

describe("formatDateTime", () => {
  test("shows a moment's date and time in the viewer's time zone", () => {
    const noonUtc = Date.UTC(2026, 9, 9, 12, 5);
    expect(formatDateTime(noonUtc, "de", { timeZone: "Europe/Berlin" })).toBe(
      "09.10.2026, 14:05",
    );
    expect(formatDateTime(noonUtc, "nb", { timeZone: "Europe/Oslo" })).toBe(
      "9. okt. 2026, 14:05",
    );
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

describe("formattersFor", () => {
  test("binds every formatter to one language", () => {
    const de = formattersFor("de", { timeZone: "UTC" });
    expect(plain(de.money(123456, "EUR"))).toBe("1.234,56 €");
    expect(plain(de.number(1234.5))).toBe("1.234,5");
    expect(de.date("2026-10-08")).toBe("08.10.2026");
    expect(de.dateTime(Date.UTC(2026, 9, 8, 9, 30))).toBe("08.10.2026, 09:30");
    expect(de.country("NO")).toBe("Norwegen");
  });
});
