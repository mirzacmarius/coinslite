import { safeNextPath } from "@/lib/next-path";

export type LinkFragment = {
  email: string;
  code: string;
  /** The page to go on to afterwards. */
  next?: string;
  /** "link" for a sign-in link; absent for an email verification or reset. */
  method?: "link";
};

/**
 * Reads what emailed links carry in the URL fragment, then removes it from the
 * address bar so it doesn't linger in history.
 */
export function takeLinkFragment(): LinkFragment | null {
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
  return {
    email,
    code,
    ...(next && { next: safeNextPath(next) }),
    ...(params.get("method") === "link" && { method: "link" as const }),
  };
}
