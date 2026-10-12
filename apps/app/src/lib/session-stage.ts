/** The session as the page sees it at one moment. */
export type SessionView = {
  /** Still confirming the session (`useConvexAuth().isLoading`). */
  isLoading: boolean;
  /** The backend accepts the session (`useConvexAuth().isAuthenticated`). */
  isAuthenticated: boolean;
  /** Whether an account is behind it (`users.getUser`); undefined while loading. */
  hasAccount: boolean | undefined;
};

/**
 * How far this page has seen the session go: not confirmed yet (a page load,
 * or the moments after signing in), confirmed (signed in, with an account),
 * or ended (confirmed, then lost).
 */
export type SessionStage = "unconfirmed" | "confirmed" | "ended";

/**
 * What a signed-in page does as the session changes: show, hide, or end the
 * session (take the page off screen and open sign-in). Only a session this
 * page saw confirmed can end, by signing out or losing its account. One not
 * confirmed yet never does: right after signing in, Convex Auth can show the
 * next page before it holds the new token, and ending that session signed
 * people out as they arrived. Meanwhile the page hides whenever its queries
 * would run without an account, so none fails with NOT_SIGNED_IN.
 */
export function sessionStep(
  stage: SessionStage,
  view: SessionView,
): { stage: SessionStage; page: "show" | "hide" | "end" } {
  const signedIn =
    (view.isLoading || view.isAuthenticated) && view.hasAccount !== false;
  if (stage === "ended" || (stage === "confirmed" && !signedIn)) {
    return { stage: "ended", page: "end" };
  }
  if (view.isAuthenticated && view.hasAccount === true) {
    return { stage: "confirmed", page: "show" };
  }
  return { stage, page: signedIn ? "show" : "hide" };
}
