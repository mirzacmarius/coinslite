/**
 * Where to go after signing in: a path on this site only, so a crafted link
 * can't send someone to another origin.
 */
export function safeNextPath(
  value: string | string[] | null | undefined,
): string {
  if (typeof value !== "string") return "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return "/";
  return value;
}

/** A full page load, so the server sees the new session before rendering. */
export function goTo(path: string) {
  window.location.assign(path);
}
