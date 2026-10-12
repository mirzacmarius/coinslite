import { expect, test } from "bun:test";
import { errorScreenLocale } from "./error-screen-locale";

test("the language this browser picked comes first", () => {
  expect(
    errorScreenLocale({
      cookies: "theme=dark; coinslite-language=nb; sidebar_state=false",
    }),
  ).toBe("nb");
  expect(
    errorScreenLocale({ urlLocale: "fr", cookies: "coinslite-language=de" }),
  ).toBe("de");
});

test("else the language of the address the page was shown at", () => {
  expect(errorScreenLocale({ urlLocale: "ro" })).toBe("ro");
  expect(
    errorScreenLocale({ urlLocale: "fr", cookies: "sidebar_state=false" }),
  ).toBe("fr");
});

test("English when neither names a language the app has", () => {
  expect(errorScreenLocale({})).toBe("en");
  expect(errorScreenLocale({ urlLocale: undefined, cookies: "" })).toBe("en");
  expect(
    errorScreenLocale({
      urlLocale: "es",
      cookies: "coinslite-language=es; Next-Locale=de",
    }),
  ).toBe("en");
});
