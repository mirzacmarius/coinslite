"use client";

import { useSignOut } from "@/components/sign-out";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";

/**
 * Confirms deleting the account, saying what goes with it and how much of
 * it, then signs out. Nothing is deleted when it fails, so it can be retried.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const { number } = useFormatters();
  const signOut = useSignOut();
  const deleteAccount = useAction(api.account.deletion.deleteAccount);
  const summary = useQuery(api.account.deletion.summary, open ? {} : "skip");
  const [failed, setFailed] = useState(false);

  const count = (value: number, more = false) =>
    more ? t("deleteAccount.atLeast", { value: number(value) }) : number(value);
  const rows = [
    {
      label: t("deleteAccount.items"),
      value: summary && count(summary.items, summary.more),
    },
    {
      label: t("deleteAccount.photos"),
      value:
        summary && count(summary.photos, summary.more || summary.morePhotos),
    },
    {
      label: t("deleteAccount.albums"),
      value: summary && count(summary.albums),
    },
  ];

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFailed(false);
        onOpenChange(next);
      }}
      title={t("deleteAccount.title")}
      description={
        summary?.endsSubscription
          ? `${t("deleteAccount.description")} ${t("deleteAccount.endsSubscription")}`
          : t("deleteAccount.description")
      }
      confirmLabel={t("deleteAccount.confirm")}
      cancelLabel={t("deleteAccount.cancel")}
      destructive
      onConfirm={async () => {
        setFailed(false);
        try {
          await deleteAccount({});
        } catch (failure) {
          setFailed(true);
          throw failure;
        }
        await signOut();
      }}
    >
      <dl className="divide-y overflow-hidden rounded-md border text-ui">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex h-9 items-center justify-between gap-2 px-3"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">
              {value ?? (
                <span
                  aria-hidden="true"
                  className="block h-3 w-8 animate-pulse rounded bg-muted"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          {t("deleteAccount.failed")}
        </p>
      )}
    </ConfirmDialog>
  );
}
