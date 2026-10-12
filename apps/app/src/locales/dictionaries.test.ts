import { describe, expect, test } from "bun:test";
import { emailChangeMessages } from "@coinslite/backend/convex/account/emailChangeMessages";
import { codeEmailMessages } from "@coinslite/backend/convex/accounts/codeEmailMessages";
import { exportLabels } from "@coinslite/backend/convex/collection/exportLabels";
import { collectionPdfMessages } from "@coinslite/backend/convex/collection/pdfMessages";
import { reportMessages } from "@coinslite/backend/convex/insuranceReport/messages";
import { releases } from "@coinslite/backend/convex/updates/releases";
import {
  type Locale,
  englishFallbacks,
  keyedTexts,
  locales,
  sharedWithEnglish,
} from "@coinslite/i18n";
import en from "./en";
import { globalErrorTexts } from "./global-error";
import { loaders } from "./loaders";

/**
 * The missing-translation check for the app's dictionaries, and the global
 * error screen's words that live beside them: every language says
 * everything in its own words (the rule and its short list of words
 * shared with English are in @coinslite/i18n). The server's own texts get the
 * same check in packages/backend/convex/translations.test.ts.
 */

const otherLanguages = locales.filter(
  (locale): locale is Exclude<Locale, "en"> => locale !== "en",
);
/** A language's dictionary, plus the global error screen's words. */
const textsOf = (locale: Locale, dictionary: unknown) => [
  ...keyedTexts(dictionary),
  ...keyedTexts(globalErrorTexts[locale], "globalError"),
];
const english = textsOf("en", en);
const englishText = new Map(english);
const dictionaries = Object.fromEntries(
  await Promise.all(
    locales.map(async (locale) => [
      locale,
      textsOf(locale, (await loaders[locale]()).default),
    ]),
  ),
) as Record<Locale, ReturnType<typeof keyedTexts>>;

describe.each(otherLanguages)("%s", (locale) => {
  const translated = dictionaries[locale];

  test("has no English fallbacks", () => {
    expect(englishFallbacks(locale, english, translated)).toEqual([]);
  });

  test("keeps the placeholders English fills in", () => {
    const placeholders = (text = "") =>
      [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();
    const changed = translated.filter(([key, text]) => {
      const expected = placeholders(englishText.get(key));
      const found = placeholders(text);
      // A plural form may name the count where English writes "1".
      return key.includes("#")
        ? found.some((name) => name !== "count" && !expected.includes(name))
        : found.join() !== expected.join();
    });
    expect(changed).toEqual([]);
  });

  test("uses typographic quotes and apostrophes", () => {
    expect(translated.filter(([, text]) => /['"]/.test(text))).toEqual([]);
  });

  test.if(locale === "fr")(
    "keeps French punctuation on the line of the word before it",
    () => {
      // A no-break space before ; : ! ? » and after «, as French typesets them.
      expect(translated.filter(([, text]) => / [;:!?»]|« /.test(text))).toEqual(
        [],
      );
    },
  );

  test("shares with English only words it really uses as English does", () => {
    // The app's texts and the server's, which follow the same list.
    const serverTexts = [
      exportLabels,
      collectionPdfMessages,
      reportMessages,
      emailChangeMessages,
      codeEmailMessages,
      ...releases.map((release) => release.notes),
    ].map((messages) => [
      keyedTexts(messages.en),
      keyedTexts(messages[locale]),
    ]);
    const shared = new Set(
      [[english, translated], ...serverTexts].flatMap(([inEnglish, inLocale]) =>
        (inLocale ?? []).flatMap(([key, text]) =>
          new Map(inEnglish).get(key) === text ? [text] : [],
        ),
      ),
    );
    expect(
      [...sharedWithEnglish[locale]].filter((word) => !shared.has(word)),
    ).toEqual([]);
  });
});
