/**
 * Reads the email and code that emailed links carry in the URL fragment, then
 * removes them from the address bar so they don't linger in history.
 */
export function takeLinkFragment(): { email: string; code: string } | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const email = params.get("email");
  const code = params.get("code");
  if (!email || !code) return null;
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  return { email, code };
}
