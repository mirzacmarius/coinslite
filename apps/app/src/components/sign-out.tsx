"use client";

import { goTo } from "@/lib/go-to";
import { nextQuery } from "@/lib/next-path";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";

/** Set once this page starts signing out; it leaves for sign-in next. */
let signingOut = false;

/** Whether this page is already signing out, so nothing else need. */
export const isSigningOut = () => signingOut;

/**
 * Signs out and opens sign-in, so no signed-in page stays on screen; `next` is
 * where signing in again leads. Once per page: a second call, such as the
 * page ending a session that is already ending, changes nothing.
 */
export function useSignOut() {
  const { signOut } = useAuthActions();
  return useCallback(
    async (next = "/") => {
      if (signingOut) return;
      signingOut = true;
      try {
        await signOut();
      } catch (failure) {
        signingOut = false;
        throw failure;
      }
      goTo(`/login${nextQuery(next)}`);
    },
    [signOut],
  );
}
