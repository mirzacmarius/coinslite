import { expect, test } from "bun:test";
import { errorScreenLocale } from "./error-screen-locale";

test("the language this browser picked, when the address names none", () => {
  expect(
    errorScreenLocale({
      cookies: "theme=dark; coinslite-language=nb; sidebar_state=false",
    }),
  ).toBe("nb");
});

test("the language of the address the page was shown at, over the cookie", () => {
  expect(errorScreenLocale({ urlLocale: "ro" })).toBe("ro");
  expect(
    errorScreenLocale({ urlLocale: "fr", cookies: "coinslite-language=de" }),
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
