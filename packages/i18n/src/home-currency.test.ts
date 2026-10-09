import { describe, expect, test } from "vitest";
import { suggestHomeCurrency } from "./index";

describe("suggestHomeCurrency", () => {
  test("follows the region of the browser's first language that has one", () => {
    expect(
      suggestHomeCurrency({ acceptLanguage: "de-CH,de;q=0.9", locale: "de" }),
    ).toBe("CHF");
    expect(
      suggestHomeCurrency({ acceptLanguage: "en-GB,en;q=0.8", locale: "en" }),
    ).toBe("GBP");
    expect(
      suggestHomeCurrency({ acceptLanguage: "fr,fr-BE;q=0.9", locale: "fr" }),
    ).toBe("EUR");
    expect(suggestHomeCurrency({ acceptLanguage: "sv-SE", locale: "en" })).toBe(
      "SEK",
    );
    expect(suggestHomeCurrency({ acceptLanguage: "da-DK", locale: "en" })).toBe(
      "DKK",
    );
  });

  test("a browser language without a region still beats the chosen interface language", () => {
    expect(
      suggestHomeCurrency({ acceptLanguage: "nb,en;q=0.8", locale: "en" }),
    ).toBe("NOK");
  });

  test("uses the language's home region when the browser names none", () => {
    expect(suggestHomeCurrency({ acceptLanguage: "nb", locale: "nb" })).toBe(
      "NOK",
    );
    expect(suggestHomeCurrency({ acceptLanguage: null, locale: "ro" })).toBe(
      "RON",
    );
    expect(suggestHomeCurrency({ acceptLanguage: null, locale: "de" })).toBe(
      "EUR",
    );
    expect(suggestHomeCurrency({ acceptLanguage: null, locale: "en" })).toBe(
      "USD",
    );
  });

  test("falls back to euro for regions without a Home currency", () => {
    expect(suggestHomeCurrency({ acceptLanguage: "ja-JP", locale: "en" })).toBe(
      "EUR",
    );
  });
});
