import { describe, expect, test } from "bun:test";
import { legalTexts } from "@/legal";
import {
  type Locale,
  englishFallbacks,
  keyedTexts,
  locales,
} from "@coinslite/i18n";
import { dictionaries } from "./dictionary";

/**
 * The site's own missing-translation check, by the rule the app's
 * dictionaries follow (@coinslite/i18n): every language says everything in
 * its own words, keeps the placeholders and writes typographic quotes.
 */

const otherLanguages = locales.filter(
  (locale): locale is Exclude<Locale, "en"> => locale !== "en",
);

/** Every text a language shows; section ids are anchors, the same in all. */
const textsIn = (locale: Locale) =>
  [
    ...keyedTexts(dictionaries[locale]),
    ...keyedTexts(legalTexts.privacy[locale], "privacy"),
    ...keyedTexts(legalTexts.terms[locale], "terms"),
  ].filter(([key]) => !key.endsWith(".id"));
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

  test.if(locale === "fr")(
    "keeps French punctuation on the line of the word before it",
    () => {
      expect(translated.filter(([, text]) => / [;:!?»]|« /.test(text))).toEqual(
        [],
      );
    },
  );
});

test("the legal texts have the same sections, in the same order, in every language", () => {
  for (const document of ["privacy", "terms"] as const) {
    const ids = (locale: Locale) =>
      legalTexts[document][locale].sections.map((section) => section.id);
    for (const locale of otherLanguages) {
      expect(ids(locale)).toEqual(ids("en"));
    }
  }
});
