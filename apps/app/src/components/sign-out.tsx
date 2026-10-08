"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";

/** Signs out and opens sign-in, so no signed-in page stays on screen. */
export function useSignOut() {
  const { signOut } = useAuthActions();
  return useCallback(async () => {
    await signOut();
    window.location.assign("/login");
  }, [signOut]);
}
