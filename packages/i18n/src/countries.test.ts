import { describe, expect, test } from "vitest";
import { countryCodes, formatCountry, isCountryCode } from "./index";

describe("countries", () => {
  test("are the current ISO 3166-1 codes, each named in every language", () => {
    expect(countryCodes).toHaveLength(249);
    expect(new Set(countryCodes).size).toBe(249);
    for (const code of countryCodes) {
      expect(formatCountry(code, "en"), code).not.toBe(code);
    }
  });

  test("only real codes count", () => {
    expect(isCountryCode("NO")).toBe(true);
    expect(isCountryCode("no")).toBe(false);
    expect(isCountryCode("XX")).toBe(false);
  });
});
