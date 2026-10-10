import type { Locale } from "@coinslite/i18n";
import de from "./dictionaries/de";
import en from "./dictionaries/en";
import fr from "./dictionaries/fr";
import nb from "./dictionaries/nb";
import ro from "./dictionaries/ro";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/**
 * The shape every language must match: exactly English's keys, with any text.
 * A missing or extra key in any language fails `bun run typecheck`.
 */
export type Dictionary = Widen<typeof en>;

export const dictionaries = { en, nb, de, fr, ro } satisfies Record<
  Locale,
  Dictionary
>;

export const getDictionary = (locale: Locale): Dictionary =>
  dictionaries[locale];
