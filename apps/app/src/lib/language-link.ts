import { type Locale, isLocale } from "@coinslite/i18n";
import { safeNextPath } from "./next-path";

/** The parameter the marketing site adds to its links: /signup?lang=de. */
export const LANGUAGE_PARAMETER = "lang";

/**
 * A link that names the language to open the app in, as the marketing site's
 * do: the language (if the app has it) and the path and query without it, on
 * this site only ("//evil.example" would leave it). Null for any other link.
 */
export function languageFromLink(
  url: URL,
): { locale: Locale | undefined; path: string } | null {
  const value = url.searchParams.get(LANGUAGE_PARAMETER);
  if (value === null) return null;
  const query = new URLSearchParams(url.search);
  query.delete(LANGUAGE_PARAMETER);
  const search = query.size > 0 ? `?${query}` : "";
  return {
    locale: isLocale(value) ? value : undefined,
    path: safeNextPath(url.pathname + search),
  };
}
