import { type Locale, defaultLocale, isLocale } from "@coinslite/i18n";
import { languageInCookies } from "./language-cookie";

/**
 * The language of the screen shown when the app itself fails
 * (global-error.tsx), which has no dictionary to go by: the one this browser
 * picked (the language cookie), else the one of the address the page was
 * shown at, else English. The address's language is what the proxy chose
 * from that cookie or the browser's languages, so it covers a browser that
 * never picked one, and the server, which can't read the cookie here.
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
  const stored = cookies === undefined ? undefined : languageInCookies(cookies);
  if (isLocale(stored)) return stored;
  return isLocale(urlLocale) ? urlLocale : defaultLocale;
}
