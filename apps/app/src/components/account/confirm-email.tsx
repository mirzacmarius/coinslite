"use client";

import {
  AuthPanel,
  AuthPanelSkeleton,
  FormMessage,
  authLink,
} from "@/components/auth/auth-panel";
import { useSignOut } from "@/components/sign-out";
import { nextQuery } from "@/lib/next-path";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Keeps the link's token while its owner signs in (perhaps through a link in another tab). */
const PENDING_TOKEN = "coinslite-email-change";
const HERE = "/confirm-email";

type Status =
  | { kind: "ready" | "working" }
  | { kind: "done"; email: string }
  | { kind: "failed"; reason: "invalid" | "inUse" | "otherAccount" | "retry" };

const reasons: Record<string, "invalid" | "inUse" | "otherAccount"> = {
  INVALID_LINK: "invalid",
  EMAIL_IN_USE: "inUse",
  OTHER_ACCOUNT: "otherAccount",
};

/**
 * Opened from the link sent to a new email address. Only the account that
 * asked can use it, so it asks to sign in first; then it waits for a click
 * (mail scanners open links too) and makes the new address the one to sign in with.
 */
export function ConfirmEmail() {
  const t = useI18n();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const confirmEmailChange = useMutation(api.account.confirmEmailChange);
  const signOut = useSignOut();
  // undefined while the fragment is read; null when the page wasn't opened from a link.
  const [token, setToken] = useState<string | null>();
  const [status, setStatus] = useState<Status>({ kind: "ready" });
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (fromLink) {
      window.localStorage.setItem(PENDING_TOKEN, fromLink);
      window.history.replaceState(null, "", window.location.pathname);
    }
    setToken(fromLink ?? window.localStorage.getItem(PENDING_TOKEN));
  }, []);

  if (token === undefined || isLoading) return <AuthPanelSkeleton />;
  const footer = (
    <Link href="/settings" className={authLink}>
      {t("account.confirmEmail.toAccount")}
    </Link>
  );
  if (token === null) {
    return (
      <AuthPanel title={t("account.confirmEmail.title")} footer={footer}>
        <FormMessage tone="info">
          {t("account.confirmEmail.noLink")}
        </FormMessage>
      </AuthPanel>
    );
  }
  if (!isAuthenticated) {
    return (
      <AuthPanel
        title={t("account.confirmEmail.title")}
        description={t("account.confirmEmail.signInFirst")}
      >
        <Button asChild className="w-full">
          <Link href={`/login${nextQuery(HERE)}`}>
            {t("account.confirmEmail.signIn")}
          </Link>
        </Button>
      </AuthPanel>
    );
  }
  if (status.kind === "done") {
    return (
      <AuthPanel title={t("account.confirmEmail.title")} footer={footer}>
        <FormMessage tone="info">
          {t("account.confirmEmail.done", { email: status.email })}
        </FormMessage>
      </AuthPanel>
    );
  }
  if (status.kind === "failed" && status.reason !== "retry") {
    return (
      <AuthPanel title={t("account.confirmEmail.title")} footer={footer}>
        <FormMessage>
          {t(
            status.reason === "invalid"
              ? "account.confirmEmail.failed"
              : status.reason === "inUse"
                ? "account.confirmEmail.inUse"
                : "account.confirmEmail.otherAccount",
          )}
        </FormMessage>
        {status.reason === "otherAccount" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void signOut(HERE)}
          >
            {t("account.confirmEmail.switchAccount")}
          </Button>
        )}
      </AuthPanel>
    );
  }
  return (
    <AuthPanel
      title={t("account.confirmEmail.title")}
      description={t("account.confirmEmail.description")}
      footer={footer}
    >
      {status.kind === "failed" && (
        <FormMessage>{t("account.confirmEmail.tryAgain")}</FormMessage>
      )}
      <Button
        className="w-full"
        disabled={status.kind === "working"}
        onClick={async () => {
          setStatus({ kind: "working" });
          try {
            const { email } = await confirmEmailChange({ token });
            window.localStorage.removeItem(PENDING_TOKEN);
            setStatus({ kind: "done", email });
          } catch (error) {
            const reason =
              error instanceof ConvexError
                ? reasons[String(error.data)]
                : undefined;
            // A used, expired or taken link won't work later either.
            if (reason === "invalid" || reason === "inUse")
              window.localStorage.removeItem(PENDING_TOKEN);
            setStatus({ kind: "failed", reason: reason ?? "retry" });
          }
        }}
      >
        {status.kind === "working" && (
          <Loader2 className="animate-spin" aria-hidden="true" />
        )}
        {t("account.confirmEmail.confirm")}
      </Button>
    </AuthPanel>
  );
}
