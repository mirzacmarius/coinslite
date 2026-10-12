"use client";

import { isSigningOut, useSignOut } from "@/components/sign-out";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { type ReactNode, useEffect } from "react";

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
 * The page, until the session ends: signing out, the session expiring or
 * ended in another tab, or the account deleted, here or elsewhere. The page
 * leaves the screen in the same render that would have run its queries
 * without an account, before they can fail with NOT_SIGNED_IN: on signing
 * out before the Convex client lets go of the session, and on deletion as
 * the account's absence arrives with their failures. Sign-in opens next,
 * unless this page is already on its way there. The app frame stays: its
 * queries return nothing without an account. While a page load is still
 * confirming the session, the page shows as usual.
 */
export function UntilSessionEnds({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Null once there is no account behind the session; undefined while loading.
  const user = useQuery(api.users.getUser);
  if ((isLoading || isAuthenticated) && user !== null) return children;
  return isSigningOut() ? null : <EndSession />;
}
