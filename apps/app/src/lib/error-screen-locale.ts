import { type Locale, defaultLocale, isLocale } from "@coinslite/i18n";
import { languageInCookies } from "./language-cookie";

/**
 * The language of the screen shown when the app itself fails
 * (global-error.tsx), which has no dictionary to go by: the language of the
 * address the page was shown at, else the one this browser picked, else
 * English. The address comes first because it is what the page was showing:
 * the proxy fills its language in from the same cookie (or the browser's
 * languages), and it is known on the server too, so both render alike.
 */
export function errorScreenLocale({
  urlLocale,
  cookies,
}: {
  /** The address's language segment, `useParams().locale`. */
  urlLocale?: unknown;
  /** `document.cookie`; unknown on the server. */
  cookies?: string;
}): Locale {
  if (isLocale(urlLocale)) return urlLocale;
  const stored = cookies === undefined ? undefined : languageInCookies(cookies);
  return isLocale(stored) ? stored : defaultLocale;
}
