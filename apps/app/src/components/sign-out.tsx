"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";

export function SignOut() {
  const t = useI18n();
  const { signOut } = useAuthActions();

  return (
    <Button
      onClick={() => void signOut()}
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {t("shell.signOut")}
    </Button>
  );
}
