import {
  type Locale,
  englishFallbacks,
  keyedTexts,
  locales,
} from "@coinslite/i18n";
import { describe, expect, test } from "vitest";
import { dictionaries } from "./dictionary";

/**
 * The site's own missing-translation check, by the rule the app's
 * dictionaries follow (@coinslite/i18n): every language says everything in
 * its own words, keeps the placeholders and writes typographic quotes.
 */

const otherLanguages = locales.filter(
  (locale): locale is Exclude<Locale, "en"> => locale !== "en",
);

const textsIn = (locale: Locale) => keyedTexts(dictionaries[locale]);
const english = textsIn("en");
const englishText = new Map(english);
const placeholders = (text = "") =>
  [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

describe.each(otherLanguages)("%s", (locale) => {
  const translated = textsIn(locale);

  test("has no English fallbacks", () => {
    expect(englishFallbacks(locale, english, translated)).toEqual([]);
  });

  test("says everything English says, and nothing more", () => {
    expect(translated.map(([key]) => key)).toEqual(english.map(([key]) => key));
  });

  test("keeps the placeholders English fills in", () => {
    const changed = translated.filter(
      ([key, text]) =>
        placeholders(text).join() !== placeholders(englishText.get(key)).join(),
    );
    expect(changed).toEqual([]);
  });

  test("uses typographic quotes and apostrophes", () => {
    expect(translated.filter(([, text]) => /['"]/.test(text))).toEqual([]);
  });

  test.runIf(locale === "fr")(
    "keeps French punctuation on the line of the word before it",
    () => {
      expect(translated.filter(([, text]) => / [;:!?»]|« /.test(text))).toEqual(
        [],
      );
    },
  );
});
