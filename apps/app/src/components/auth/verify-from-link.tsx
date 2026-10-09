"use client";

import { goTo } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthPanel, FormMessage, authLink } from "./auth-panel";
import { takeLinkFragment } from "./link-fragment";
import { useAuthStep } from "./use-password-auth";

type Status = "working" | "failed" | "linkFailed" | "noLink";

/**
 * Opened from an emailed link: a verification (after a password sign-up) or a
 * sign-in link. Checks the code it carries, signs in and goes on to the page
 * the person was heading to.
 */
export function VerifyFromLink({ next }: { next: string }) {
  const t = useI18n();
  const verifyEmail = useAuthStep("password");
  const signInWithLink = useAuthStep("magic-link");
  const [status, setStatus] = useState<Status>("working");
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
    const { email, code, next: fromLink, method } = link;
    const step =
      method === "link"
        ? signInWithLink({ email, code })
        : verifyEmail({ flow: "email-verification", email, code });
    void step.then((result) => {
      if (result === "signedIn") goTo(fromLink ?? next);
      else setStatus(method === "link" ? "linkFailed" : "failed");
    });
  }, [verifyEmail, signInWithLink, next]);

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
      {status === "linkFailed" && (
        <FormMessage>{t("auth.link.failed")}</FormMessage>
      )}
      {status === "noLink" && (
        <FormMessage tone="info">{t("auth.verify.noLink")}</FormMessage>
      )}
    </AuthPanel>
  );
}
