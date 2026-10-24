"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { typedWord } from "./confirm-word";

/**
 * The way to delete the account: greyed out while the Premium subscription
 * still renews, when pressing it says to cancel that first; otherwise it
 * opens DeleteAccountDialog. Meant for a wrapping row of buttons, where its
 * note takes a line of its own below them.
 */
export function DeleteAccountButton() {
  const t = useI18n();
  const subscription = useQuery(api.billing.status, {})?.subscription;
  // The dialog and the server check again, counting every subscription.
  const renews = subscription ? !subscription.cancelAtPeriodEnd : false;
  const [deleting, setDeleting] = useState(false);
  const [explained, setExplained] = useState(false);
  const noteId = useId();
  return (
    <>
      <Button
        variant="outline"
        aria-disabled={renews || undefined}
        aria-describedby={renews && explained ? noteId : undefined}
        className={cn(
          renews && "text-muted-foreground opacity-60 hover:bg-card",
        )}
        onClick={() => (renews ? setExplained(true) : setDeleting(true))}
      >
        <Trash2 strokeWidth={1.75} aria-hidden="true" />
        {t("account.danger.delete")}
      </Button>
      {renews && explained && (
        <p id={noteId} role="alert" className="basis-full text-xs">
          {t("deleteAccount.subscriptionActive")}
        </p>
      )}
      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </>
  );
}

/**
 * Confirms deleting the account, saying what goes with it and how much of
 * it, once a word (DELETE, in the person's language) is typed. It's
 * deactivated at once and deleted in 21 days (account/closing.ts), and the
 * app shows the deactivated account (DeactivatedAccount). Not while a
 * subscription would renew: that's cancelled first, under Manage
 * subscription.
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
  const requestDeletion = useMutation(api.account.closing.requestDeletion);
  const summary = useQuery(api.account.deletion.summary, open ? {} : "skip");
  const [failed, setFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const wordId = useId();
  const word = t("deleteAccount.word");

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
        if (!next) {
          setFailed(false);
          setTyped("");
        }
        onOpenChange(next);
      }}
      title={t("deleteAccount.title")}
      description={t("deleteAccount.description")}
      confirmLabel={t("deleteAccount.confirm")}
      cancelLabel={t("deleteAccount.cancel")}
      destructive
      confirmDisabled={
        summary?.endsSubscription !== false || !typedWord(typed, word)
      }
      onConfirm={async () => {
        setFailed(false);
        try {
          await requestDeletion({});
        } catch (failure) {
          setFailed(true);
          throw failure;
        }
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
      {summary?.endsSubscription ? (
        <p role="alert" className="text-xs text-destructive">
          {t("deleteAccount.subscriptionActive")}
        </p>
      ) : (
        <Field id={wordId} label={t("deleteAccount.typeToConfirm", { word })}>
          {(control) => (
            <Input
              {...control}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
      )}
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          {t("deleteAccount.failed")}
        </p>
      )}
    </ConfirmDialog>
  );
}
