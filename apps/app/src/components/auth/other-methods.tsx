"use client";

import { nextQuery } from "@/lib/next-path";
import { releaseAllUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { Mail } from "lucide-react";
import Link from "next/link";

/**
 * Google and sign-in links, under the password form. Both also create an
 * account, which then finishes setting up on /welcome.
 */
export function OtherSignInMethods({ next }: { next: string }) {
  const t = useI18n();
  const { signIn } = useAuthActions();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("auth.methods.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          // Google takes over the page: what was typed here is done with.
          releaseAllUnsavedInput();
          void signIn("google", { redirectTo: `/welcome${nextQuery(next)}` });
        }}
      >
        <GoogleMark />
        {t("auth.methods.google")}
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href={`/link${nextQuery(next)}`}>
          <Mail strokeWidth={1.75} aria-hidden="true" />
          {t("auth.methods.link")}
        </Link>
      </Button>
    </div>
  );
}

/** Google's "G", which its sign-in guidelines ask buttons to show. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.2v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
