import { LANGUAGE_COOKIE, ONE_YEAR_IN_SECONDS } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";

/** Stores the language picked in the switcher, as the app's language menu does. */
export function rememberLanguage(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser we support
  document.cookie = `${LANGUAGE_COOKIE}=${locale}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
}
