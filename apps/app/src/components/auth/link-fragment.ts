import { safeNextPath } from "@/lib/next-path";

/**
 * Reads what emailed links carry in the URL fragment (email, code and the page
 * to return to), then removes it from the address bar so it doesn't linger in
 * history.
 */
export function takeLinkFragment(): {
  email: string;
  code: string;
  next?: string;
} | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const email = params.get("email");
  const code = params.get("code");
  if (!email || !code) return null;
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  const next = params.get("next");
  return { email, code, ...(next && { next: safeNextPath(next) }) };
}
