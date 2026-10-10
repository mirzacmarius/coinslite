import type { Locale } from "./locale";

/**
 * The missing-translation rule, which the app's dictionaries and the server's
 * texts (emails, PDFs, the CSV, release notes) are each checked against: a
 * text another language leaves exactly as in English is an English fallback,
 * unless it is a word that language shares with English (listed below), or it
 * has no words at all ("{value}+", "1 {from} = {rate} {to}").
 *
 * Keep the lists short: each entry is a real word in that language, used with
 * the same meaning there.
 */

/** Names, units and codes every language writes as English does. */
const everyLanguage = [
  "Premium",
  "Numista",
  "Album",
  "Indigo",
  "Sheldon (1–70)",
  "mm",
  "g",
  "https://",
  "CC BY-SA 4.0",
  "Wikimedia Commons",
];

/** Words that are each language's own as well as English. */
const ownWords: Record<Exclude<Locale, "en">, string[]> = {
  nb: [
    "Aluminium",
    "Beta",
    "Diameter",
    "Filter",
    "ID",
    "Import",
    "Palladium",
    "Per gram",
    "Plan",
    "Proof",
    "Send",
    "Status",
    "System",
    "Type",
  ],
  de: [
    "Admin",
    "Aluminium",
    "Banknote",
    "Beta",
    "Bronze",
    "Code",
    "Export",
    "Feedback",
    "Filter",
    "Gold",
    "ID",
    "Import",
    "International (UNC–PR)",
    "Link",
    "Material",
    "Name",
    "Nickel",
    "Orange",
    "Palladium",
    "Scanner",
    "Set",
    "Status",
    "System",
    "Version {version}",
  ],
  fr: [
    "Admin",
    "Albums",
    "Aluminium",
    "Bronze",
    "Circulation",
    "Code",
    "Collection",
    "Composition",
    "Cupronickel",
    "Description",
    "Export",
    "Image",
    "Import",
    "Licence",
    "Message",
    "Nickel",
    "Notes",
    "Orange",
    "Pages",
    "Palladium",
    "Photos",
    "Scanner",
    "Source",
    "Sources",
    "Total",
    "Type",
    "Version {version}",
    "Zinc",
    // The Collection's file names: "collection" is French too.
    "coinslite-collection",
    "coinslite-collection-{date}.csv",
  ],
  ro: [
    "Active",
    "Beta",
    "Catalog",
    "Credit",
    "Export",
    "Feedback",
    "ID",
    "Import",
    "Link",
    "Material",
    "Metal",
    "Plan",
    "Proof",
    "Set",
    "Total",
    "Zinc",
  ],
};

/** What each language may leave as in English. */
export const sharedWithEnglish: Record<
  Exclude<Locale, "en">,
  ReadonlySet<string>
> = {
  nb: new Set([...everyLanguage, ...ownWords.nb]),
  de: new Set([...everyLanguage, ...ownWords.de]),
  fr: new Set([...everyLanguage, ...ownWords.fr]),
  ro: new Set([...everyLanguage, ...ownWords.ro]),
};

/** A text and where it lives, e.g. ["items.title", "Title"]. */
export type KeyedText = readonly [key: string, text: string];

/**
 * Every text in a message object, by its dotted path. A message that takes
 * values (a function) is written out with stand-ins: "Page ⟨1⟩ of ⟨2⟩".
 */
export function keyedTexts(messages: unknown, prefix = ""): KeyedText[] {
  if (typeof messages === "string") return [[prefix, messages]];
  if (typeof messages === "function") {
    const standIns = Array.from(
      { length: messages.length },
      (_, index) => `⟨${index + 1}⟩`,
    );
    return [[prefix, String(messages(...standIns))]];
  }
  if (messages === null || typeof messages !== "object") return [];
  return Object.entries(messages).flatMap(([key, value]) =>
    keyedTexts(value, prefix ? `${prefix}.${key}` : key),
  );
}

/** Whether a text has any words once its {placeholders} are taken out. */
const hasWords = (text: string) => /\p{L}/u.test(text.replace(/\{\w+\}/g, ""));

/** The texts `translated` (in `locale`) leaves exactly as English has them. */
export function englishFallbacks(
  locale: Exclude<Locale, "en">,
  english: readonly KeyedText[],
  translated: readonly KeyedText[],
): KeyedText[] {
  const englishText = new Map(english);
  return translated.filter(
    ([key, text]) =>
      text === englishText.get(key) &&
      hasWords(text) &&
      !sharedWithEnglish[locale].has(text),
  );
}
