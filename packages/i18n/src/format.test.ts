import { describe, expect, test } from "bun:test";
import {
  formatCountry,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formattersFor,
  homeCurrencies,
  locales,
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
    expect(plain(formatMoney(123456, "RON", "ro"))).toBe("1.234,56 lei");
    expect(plain(formatMoney(123456, "CHF", "fr"))).toBe("1 234,56 CHF");
  });

  test("shows the currency's symbol, not its ISO code, in every language", () => {
    expect(plain(formatMoney(123456, "NOK", "en"))).toBe("kr 1,234.56");
    expect(plain(formatMoney(123456, "SEK", "de"))).toBe("1.234,56 kr");
    expect(plain(formatMoney(123456, "DKK", "fr"))).toBe("1 234,56 kr");
    expect(plain(formatMoney(123456, "USD", "nb"))).toBe("1 234,56 $");
    expect(plain(formatMoney(123456, "USD", "fr"))).toBe("1 234,56 $");
    expect(plain(formatMoney(123456, "GBP", "ro"))).toBe("1.234,56 £");
    expect(plain(formatMoney(123456, "EUR", "ro"))).toBe("1.234,56 €");
    expect(plain(formatMoney(123456, "RON", "en"))).toBe("lei 1,234.56");
    for (const locale of locales) {
      expect(plain(formatMoney(123456, "RON", locale))).toContain("lei");
      for (const currency of homeCurrencies) {
        // The Swiss franc's symbol is "CHF" itself.
        if (currency === "CHF") continue;
        expect(formatMoney(123456, currency, locale)).not.toContain(currency);
      }
    }
  });

  test("beside another krone, shows its ISO code", () => {
    expect(plain(formatMoney(100000, "SEK", "nb", { besides: "NOK" }))).toBe(
      "1 000,00 SEK",
    );
    expect(plain(formatMoney(100000, "DKK", "en", { besides: "SEK" }))).toBe(
      "DKK 1,000.00",
    );
    expect(plain(formatMoney(100000, "NOK", "nb", { besides: "NOK" }))).toBe(
      "1 000,00 kr",
    );
    expect(plain(formatMoney(12000, "EUR", "nb", { besides: "NOK" }))).toBe(
      "120,00 €",
    );
    expect(plain(formatMoney(12000, "RON", "ro", { besides: "NOK" }))).toBe(
      "120,00 lei",
    );
  });

  test("can show the sign of a gain or a loss", () => {
    expect(formatMoney(15000, "NOK", "en", { signed: true })).toBe(
      "+kr\u00a0150.00",
    );
    expect(plain(formatMoney(-85000, "NOK", "en", { signed: true }))).toBe(
      "-kr 850.00",
    );
    expect(plain(formatMoney(-85000, "NOK", "nb", { signed: true }))).toBe(
      "−850,00 kr",
    );
    expect(formatMoney(0, "EUR", "en", { signed: true })).toBe("€0.00");
  });

  test("can abbreviate large amounts", () => {
    expect(formatMoney(15000000, "NOK", "en", { compact: true })).toBe(
      "kr\u00a0150K",
    );
    expect(plain(formatMoney(125000000, "EUR", "de", { compact: true }))).toBe(
      "1,3 Mio. €",
    );
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
