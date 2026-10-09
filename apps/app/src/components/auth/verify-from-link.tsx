"use client";

import { goTo } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AuthPanel,
  AuthPanelSkeleton,
  FormMessage,
  authLink,
} from "./auth-panel";
import { type LinkFragment, takeLinkFragment } from "./link-fragment";
import { useAuthStep } from "./use-auth-step";

/**
 * Opened from an emailed link: a verification (after a password sign-up) or a
 * sign-in link. It waits for a click before using the code, because mail
 * scanners open links too, and goes on to the page the person was heading to.
 */
export function VerifyFromLink({ next }: { next: string }) {
  const t = useI18n();
  // undefined while the fragment is read; null when the page wasn't opened from a link.
  const [link, setLink] = useState<LinkFragment | null>();
  // Reading it also clears it, so read once even when effects run twice.
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    setLink(takeLinkFragment());
  }, []);

  if (link === undefined) return <AuthPanelSkeleton />;
  if (link === null) {
    return (
      <AuthPanel title={t("auth.verify.title")} footer={<BackToSignIn />}>
        <FormMessage tone="info">{t("auth.verify.noLink")}</FormMessage>
      </AuthPanel>
    );
  }
  return <ConfirmLink link={link} next={link.next ?? next} />;
}

function ConfirmLink({ link, next }: { link: LinkFragment; next: string }) {
  const t = useI18n();
  const verifyEmail = useAuthStep("password");
  const signInWithLink = useAuthStep("magic-link");
  const [status, setStatus] = useState<"ready" | "working" | "failed">("ready");
  const { email, code } = link;
  const isSignInLink = link.method === "link";

  const confirm = async () => {
    setStatus("working");
    const result = isSignInLink
      ? await signInWithLink({ email, code })
      : await verifyEmail({ flow: "email-verification", email, code });
    if (result === "signedIn") goTo(next);
    else setStatus("failed");
  };

  return (
    <AuthPanel
      title={t(isSignInLink ? "auth.link.confirmTitle" : "auth.verify.title")}
      description={
        isSignInLink
          ? t("auth.link.confirmDescription", { email })
          : t("auth.verify.description", { email })
      }
      footer={<BackToSignIn />}
    >
      {status === "failed" ? (
        <FormMessage>
          {t(isSignInLink ? "auth.link.failed" : "auth.verify.failed")}
        </FormMessage>
      ) : (
        <Button
          className="w-full"
          disabled={status === "working"}
          onClick={confirm}
        >
          {status === "working" && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {t(isSignInLink ? "auth.link.confirm" : "auth.verify.confirm")}
        </Button>
      )}
    </AuthPanel>
  );
}

function BackToSignIn() {
  const t = useI18n();
  return (
    <Link href="/login" className={authLink}>
      {t("auth.backToSignIn")}
    </Link>
  );
}
