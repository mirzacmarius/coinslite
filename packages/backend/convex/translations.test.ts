import { describe, expect, test } from "bun:test";
import {
  type KeyedText,
  type Locale,
  englishFallbacks,
  keyedTexts,
  locales,
} from "@coinslite/i18n";
import { closingMessages } from "./account/closingMessages";
import { emailChangeMessages } from "./account/emailChangeMessages";
import { codeEmailMessages } from "./accounts/codeEmailMessages";
import { exportLabels } from "./collection/exportLabels";
import { collectionPdfMessages } from "./collection/pdfMessages";
import { reportMessages } from "./insuranceReport/messages";
import { releaseGroups, releases } from "./updates/releases";

/**
 * The missing-translation check for what the server writes in the person's
 * language: emails, the Collection CSV and PDF, the Insurance report and the
 * release notes. Each is a `Record<Locale, …>`; add new ones here. The rule
 * (and the short list of words a language shares with English) is the one the
 * app's dictionaries are checked against, in @coinslite/i18n.
 */
const localized: Record<string, Record<Locale, unknown>> = {
  "Email change emails": emailChangeMessages,
  "Account closing emails": closingMessages,
  "Sign-in code emails": codeEmailMessages,
  "Collection CSV": exportLabels,
  "Collection PDF": collectionPdfMessages,
  "Insurance report": reportMessages,
  ...Object.fromEntries(
    releases.map((release) => [
      `Release notes ${release.version}`,
      release.notes,
    ]),
  ),
};

const otherLanguages = locales.filter(
  (locale): locale is Exclude<Locale, "en"> => locale !== "en",
);

describe.each(Object.entries(localized))("%s", (_, messages) => {
  const english = keyedTexts(messages.en);

  test.each(otherLanguages)("%s has no English fallbacks", (locale) => {
    expect(
      englishFallbacks(locale, english, keyedTexts(messages[locale])),
    ).toEqual([]);
  });

  test("French keeps its punctuation on the line of the word before it", () => {
    // A no-break space before ; : ! ? » and after «, as French typesets them.
    expect(
      keyedTexts(messages.fr).filter(([, text]) => / [;:!?»]|« /.test(text)),
    ).toEqual([]);
  });

  test.each(otherLanguages)(
    "%s says everything English says, with the same values filled in",
    (locale) => {
      const translated = new Map(keyedTexts(messages[locale]));
      const standIns = (text = "") => text.match(/⟨\d⟩/g)?.sort() ?? [];
      const differences = english.filter(
        ([key, text]): boolean =>
          !translated.has(key) ||
          standIns(translated.get(key)).join() !== standIns(text).join(),
      );
      expect(differences).toEqual([] as KeyedText[]);
    },
  );
});

test("every language has the same release notes, group by group", () => {
  for (const release of releases) {
    for (const locale of locales) {
      for (const group of ["highlights", ...releaseGroups] as const) {
        expect(
          release.notes[locale][group]?.length,
          `${release.version} ${locale} ${group}`,
        ).toBe(release.notes.en[group]?.length);
      }
    }
  }
});
