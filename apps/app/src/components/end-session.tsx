"use client";

import { isSigningOut, useSignOut } from "@/components/sign-out";
import { type SessionStage, sessionStep } from "@/lib/session-stage";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { type ReactNode, useEffect, useState } from "react";

/**
 * Rendered when a session outlives its account (deleted elsewhere): signs out
 * and opens sign-in, instead of bouncing between sign-in and the app.
 */
export function EndSession() {
  const signOut = useSignOut();
  useEffect(() => {
    void signOut();
  }, [signOut]);
  return null;
}

/**
 * The page, until the session ends (sessionStep decides): signing out, the
 * session expiring or ended in another tab, or the account deleted, here or
 * elsewhere. The page leaves the screen in the same render that would have
 * run its queries without an account, before they can fail with
 * NOT_SIGNED_IN: on signing out before the Convex client lets go of the
 * session, and on deletion as the account's absence arrives with their
 * failures. Sign-in opens next, unless this page is already on its way
 * there. Only a session this page saw confirmed ends; one still being
 * confirmed, as right after signing in, never does. The app frame stays:
 * its queries return nothing without an account.
 */
export function UntilSessionEnds({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Null once there is no account behind the session; undefined while loading.
  const user = useQuery(api.users.getUser);
  const [stage, setStage] = useState<SessionStage>("unconfirmed");
  const step = sessionStep(stage, {
    isLoading,
    isAuthenticated,
    hasAccount: user === undefined ? undefined : user !== null,
  });
  // Kept for the next render; this one already acts on it.
  if (step.stage !== stage) setStage(step.stage);
  if (step.page === "show") return children;
  if (step.page === "hide" || isSigningOut()) return null;
  return <EndSession />;
}
