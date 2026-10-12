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
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser we support
  document.cookie = `${LANGUAGE_COOKIE}=${locale}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

/** The language stored in a list of cookies (as in `document.cookie`), if any. */
export function languageInCookies(cookies: string) {
  return cookies
    .split("; ")
    .find((cookie) => cookie.startsWith(`${LANGUAGE_COOKIE}=`))
    ?.slice(LANGUAGE_COOKIE.length + 1);
}

/** The language this browser last picked, if any. */
export function rememberedLanguage() {
  return languageInCookies(document.cookie);
}

/** sessionStorage: this tab is saving a language to the profile. */
const SAVING_KEY = "coinslite-language-saving";
/** localStorage: when the profile last changed language that this browser knows of. */
const KNOWN_CHANGE_KEY = "coinslite-language-changed-at";

/** Storage can be unavailable (private modes, blocked cookies); the profile then applies as before. */
function storage(kind: "session" | "local") {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Notes that this tab is saving a language choice to the profile. */
export function noteSavingLanguage() {
  storage("session")?.setItem(SAVING_KEY, "1");
}

/**
 * Notes a profile language change this browser knows of: one it made itself
 * (with the time `setLanguage` returned) or one it brought over from the
 * profile. Ends a save started with `noteSavingLanguage`.
 */
export function noteLanguageChange(changedAt: number | undefined) {
  storage("session")?.removeItem(SAVING_KEY);
  if (changedAt !== undefined)
    storage("local")?.setItem(KNOWN_CHANGE_KEY, String(changedAt));
}

/**
 * Whether the profile's language is a change this browser hasn't seen: made
 * on another device after this browser's own last choice. Right after a
 * switch the page can still read the profile's previous language; it is
 * older, so it doesn't undo the switch (MUS-736).
 */
export function isNewerLanguageChange(changedAt: number | undefined) {
  if (storage("session")?.getItem(SAVING_KEY)) return false;
  const known = Number(storage("local")?.getItem(KNOWN_CHANGE_KEY) ?? -1);
  return (changedAt ?? 0) > known;
}
