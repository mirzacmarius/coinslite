export const locales = ["en", "nb", "de", "fr", "ro"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Each language's own name for itself, as shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  nb: "Norsk bokmål",
  de: "Deutsch",
  fr: "Français",
  ro: "Română",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** Maps a BCP 47 tag such as "nn-NO" or "fr-CA" to a supported locale, if any. */
export function matchLocale(tag: string): Locale | undefined {
  const language = tag.trim().toLowerCase().split("-")[0];
  if (language === "no" || language === "nn") return "nb";
  return isLocale(language) ? language : undefined;
}

/**
 * Picks the language to show: the user's stored preference, else the browser's
 * best supported language, else English.
 */
export function resolveLocale({
  stored,
  acceptLanguage,
}: {
  stored?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const fromStored = stored ? matchLocale(stored) : undefined;
  if (fromStored) return fromStored;
  for (const tag of preferredTags(acceptLanguage ?? "")) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return defaultLocale;
}

/** The tags of an Accept-Language header, best first. */
export function preferredTags(acceptLanguage: string): string[] {
  return acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const weight = quality ? Number(quality.slice(2)) : 1;
      return {
        tag: tag.trim(),
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter(({ tag, weight }) => tag && tag !== "*" && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ tag }) => tag);
}
