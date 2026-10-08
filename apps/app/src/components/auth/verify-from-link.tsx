"use client";

import { goTo } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { takeLinkFragment } from "./link-fragment";
import { usePasswordAuth } from "./use-password-auth";

/** Opened from the verification email: checks the code in the link and signs in. */
export function VerifyFromLink({ next }: { next: string }) {
  const t = useI18n();
  const attempt = usePasswordAuth();
  const [status, setStatus] = useState<"working" | "failed" | "noLink">(
    "working",
  );
  const started = useRef(false);

  useEffect(() => {
    // Codes work once; don't send it twice if the effect runs again.
    if (started.current) return;
    started.current = true;
    const link = takeLinkFragment();
    if (!link) {
      setStatus("noLink");
      return;
    }
    void attempt({ flow: "email-verification", ...link }).then((result) => {
      if (result === "signedIn") goTo(next);
      else setStatus("failed");
    });
  }, [attempt, next]);

  return (
    <AuthPanel
      title={t("auth.verify.title")}
      footer={
        status !== "working" && (
          <Link href="/login" className={authLink}>
            {t("auth.backToSignIn")}
          </Link>
        )
      }
    >
      {status === "working" && (
        <p
          className="flex items-center gap-2 text-[13px] text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("auth.verify.working")}
        </p>
      )}
      {status === "failed" && (
        <FormMessage>{t("auth.verify.failed")}</FormMessage>
      )}
      {status === "noLink" && (
        <FormMessage tone="info">{t("auth.verify.noLink")}</FormMessage>
      )}
    </AuthPanel>
  );
}
