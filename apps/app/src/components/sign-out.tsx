"use client";

import { goTo } from "@/lib/go-to";
import { nextQuery } from "@/lib/next-path";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { type ReactNode, useCallback } from "react";

/**
 * Signs out and opens sign-in, so no signed-in page stays on screen; `next` is
 * where signing in again leads.
 */
export function useSignOut() {
  const { signOut } = useAuthActions();
  return useCallback(
    async (next = "/") => {
      await signOut();
      goTo(`/login${nextQuery(next)}`);
    },
    [signOut],
  );
}

/**
 * The page, until the session ends. Once it does (signing out, here or in
 * another tab, also after deleting the account) the page leaves the screen
 * before the Convex client lets go of the session, so none of its queries
 * runs signed out and fails with NOT_SIGNED_IN. The app frame stays: its
 * queries return nothing without an account. While a page load is still
 * confirming the session, the page shows as usual.
 */
export function UntilSignedOut({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  return isLoading || isAuthenticated ? children : null;
}
