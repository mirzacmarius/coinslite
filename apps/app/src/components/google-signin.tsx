"use client";

import { Button } from "@coinslite/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";

export function GoogleSignin({ label }: { label: string }) {
  const { signIn } = useAuthActions();

  return (
    <Button onClick={() => signIn("google")} variant="outline">
      {label}
    </Button>
  );
}
