"use client";

import { nextQuery } from "@/lib/next-path";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";

/**
 * Signs out and opens sign-in, so no signed-in page stays on screen; `next` is
 * where signing in again leads.
 */
export function useSignOut() {
  const { signOut } = useAuthActions();
  return useCallback(
    async (next = "/") => {
      await signOut();
      window.location.assign(`/login${nextQuery(next)}`);
    },
    [signOut],
  );
}
