"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import type { Value } from "convex/values";
import { useCallback } from "react";

export type AuthStepResult = "signedIn" | "codeSent" | "failed";

/**
 * Runs one step of a sign-in flow with the given Convex Auth provider. Through
 * the Next.js auth proxy a rejected step arrives as a plain error with the
 * server's message text but not a ConvexError's code, so each form explains
 * the likely cause itself; the backend still enforces every rule.
 */
export function useAuthStep(provider: "password" | "magic-link") {
  const { signIn } = useAuthActions();
  return useCallback(
    async (params: Record<string, Value>): Promise<AuthStepResult> => {
      try {
        const { signingIn } = await signIn(provider, params);
        return signingIn ? "signedIn" : "codeSent";
      } catch {
        return "failed";
      }
    },
    [signIn, provider],
  );
}
