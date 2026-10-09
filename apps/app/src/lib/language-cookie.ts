import type { Locale } from "@coinslite/i18n";

/** The language the user picked: kept for a year and sent on links from other sites. */
export const LANGUAGE_COOKIE = "coinslite-language";
export const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores an explicit choice. Only the language menu calls this, so a language
 * that was merely detected (or reached through a rewritten path) is never kept.
 */
export function rememberLanguage(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANGUAGE_COOKIE}=${locale}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
}
