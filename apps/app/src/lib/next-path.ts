const SAME_SITE = "https://coinslite.invalid";

/**
 * Where to go after signing in: a path on this site only, so a crafted link
 * can't send someone to another origin. Parsing (rather than prefix checks)
 * also catches tricks like "/\t/evil.com", which browsers read as "//evil.com".
 */
export function safeNextPath(
  value: string | string[] | null | undefined,
): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  try {
    const url = new URL(value, SAME_SITE);
    return url.origin === SAME_SITE
      ? url.pathname + url.search + url.hash
      : "/";
  } catch {
    return "/";
  }
}

/** "?next=…" for links between the auth pages, or nothing when it's the home page. */
export const nextQuery = (next: string) =>
  next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
