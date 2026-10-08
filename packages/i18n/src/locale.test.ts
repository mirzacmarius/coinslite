import { describe, expect, test } from "vitest";
import { defaultLocale, locales, resolveLocale } from "./index";

describe("supported languages", () => {
  test("are the five launch languages, with English as the default", () => {
    expect(locales).toEqual(["en", "nb", "de", "fr", "ro"]);
    expect(defaultLocale).toBe("en");
  });
});

describe("resolveLocale", () => {
  test("a supported stored preference wins over the browser", () => {
    expect(
      resolveLocale({ stored: "de", acceptLanguage: "fr-FR,fr;q=0.9" }),
    ).toBe("de");
  });

  test("an unsupported stored preference falls through to the browser", () => {
    expect(
      resolveLocale({
        stored: "es",
        acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8",
      }),
    ).toBe("fr");
  });

  test("the browser's highest-weighted supported language is used", () => {
    expect(resolveLocale({ acceptLanguage: "de;q=0.5, ro;q=0.9" })).toBe("ro");
    expect(resolveLocale({ acceptLanguage: "ja-JP, de-AT;q=0.7" })).toBe("de");
  });

  test("every Norwegian variant resolves to Bokmål", () => {
    for (const tag of ["no", "nb", "nb-NO", "nn", "nn-NO"]) {
      expect(resolveLocale({ acceptLanguage: tag })).toBe("nb");
    }
    expect(resolveLocale({ stored: "no" })).toBe("nb");
  });

  test("English is the fallback when nothing supported is offered", () => {
    expect(resolveLocale({ acceptLanguage: "ja-JP,zh;q=0.8" })).toBe("en");
    expect(resolveLocale({})).toBe("en");
    expect(resolveLocale({ stored: "", acceptLanguage: "*" })).toBe("en");
  });
});
