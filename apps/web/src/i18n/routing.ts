import { type Locale, isLocale, resolveLocale } from "@coinslite/i18n";

/**
 * The language a visitor picked in the switcher, kept for a year. The app
 * uses the same name for the same choice (apps/app/src/lib/language-cookie.ts).
 */
export const LANGUAGE_COOKIE = "coinslite-language";
export const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** The language a path is in, from its first segment: "/de/terms" is German. */
export function localeOf(pathname: string): Locale | undefined {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : undefined;
}

/** A page of this site in one language: localePath("de", "/terms") is "/de/terms". */
export function localePath(locale: Locale, path = "/") {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** The same page in another language: "/de/terms" becomes "/fr/terms". */
export function switchLocale(pathname: string, locale: Locale) {
  const current = localeOf(pathname);
  const rest = current ? pathname.slice(current.length + 1) : pathname;
  return localePath(locale, rest || "/");
}

/**
 * Where a request for a page without a language goes: the same page in the
 * stored choice, else the browser's language, else English (the app's rule).
 * Null for a page that names its language already.
 */
export function languageRedirect({
  pathname,
  stored,
  acceptLanguage,
}: {
  pathname: string;
  stored?: string | null;
  acceptLanguage?: string | null;
}): string | null {
  if (localeOf(pathname)) return null;
  return localePath(resolveLocale({ stored, acceptLanguage }), pathname);
}
