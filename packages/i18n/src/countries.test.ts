import { describe, expect, test } from "vitest";
import { countryCodes, formatCountry, isCountryCode, locales } from "./index";

describe("countries", () => {
  test("are the current ISO 3166-1 codes, each named in every language", () => {
    expect(countryCodes).toHaveLength(249);
    expect(new Set(countryCodes).size).toBe(249);
    for (const locale of locales) {
      for (const code of countryCodes) {
        expect(formatCountry(code, locale), `${locale} ${code}`).not.toBe(code);
      }
    }
  });

  test("are named in the reader's own language, not in English", () => {
    expect(formatCountry("US", "en")).toBe("United States");
    expect(formatCountry("US", "nb")).toBe("USA");
    expect(formatCountry("US", "de")).toBe("Vereinigte Staaten");
    expect(formatCountry("US", "fr")).toBe("États-Unis");
    expect(formatCountry("US", "ro")).toBe("Statele Unite ale Americii");
    expect(formatCountry("DE", "nb")).toBe("Tyskland");
    expect(formatCountry("NO", "de")).toBe("Norwegen");
    expect(formatCountry("GB", "fr")).toBe("Royaume-Uni");
    expect(formatCountry("FR", "ro")).toBe("Franța");
  });

  test("only real codes count", () => {
    expect(isCountryCode("NO")).toBe(true);
    expect(isCountryCode("no")).toBe(false);
    expect(isCountryCode("XX")).toBe(false);
  });
});
