"use client";

import {
  AuthPanel,
  AuthPanelSkeleton,
  FormMessage,
  authLink,
} from "@/components/auth/auth-panel";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Opened from the link sent to a new email address. It waits for a click
 * (mail scanners open links too), then makes the new address the one to sign in with.
 */
export function ConfirmEmail() {
  const t = useI18n();
  const confirmEmailChange = useMutation(api.account.confirmEmailChange);
  // undefined while the fragment is read; null when the page wasn't opened from a link.
  const [token, setToken] = useState<string | null>();
  const [status, setStatus] = useState<
    | { kind: "ready" | "working" | "failed" | "inUse" }
    | { kind: "done"; email: string }
  >({ kind: "ready" });
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (value) window.history.replaceState(null, "", window.location.pathname);
    setToken(value);
  }, []);

  if (token === undefined) return <AuthPanelSkeleton />;
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
  if (status.kind === "done") {
    return (
      <AuthPanel title={t("account.confirmEmail.title")} footer={footer}>
        <FormMessage tone="info">
          {t("account.confirmEmail.done", { email: status.email })}
        </FormMessage>
      </AuthPanel>
    );
  }
  return (
    <AuthPanel
      title={t("account.confirmEmail.title")}
      description={t("account.confirmEmail.description")}
      footer={footer}
    >
      {status.kind === "failed" || status.kind === "inUse" ? (
        <FormMessage>
          {t(
            status.kind === "inUse"
              ? "account.confirmEmail.inUse"
              : "account.confirmEmail.failed",
          )}
        </FormMessage>
      ) : (
        <Button
          className="w-full"
          disabled={status.kind === "working"}
          onClick={async () => {
            setStatus({ kind: "working" });
            try {
              const { email } = await confirmEmailChange({ token });
              setStatus({ kind: "done", email });
            } catch (error) {
              setStatus({
                kind:
                  error instanceof ConvexError && error.data === "EMAIL_IN_USE"
                    ? "inUse"
                    : "failed",
              });
            }
          }}
        >
          {status.kind === "working" && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {t("account.confirmEmail.confirm")}
        </Button>
      )}
    </AuthPanel>
  );
}
