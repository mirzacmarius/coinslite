"use client";

import { useSignOut } from "@/components/sign-out";
import { useEffect } from "react";

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
