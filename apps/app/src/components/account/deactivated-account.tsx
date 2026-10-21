"use client";

import { useSignOut } from "@/components/sign-out";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * In place of every page while the account is deactivated, on its way to
 * being deleted (account/closing.ts): the app's pages are closed to it, and
 * the backend turns their requests away.
 */
export function DeactivatedGate({ children }: { children: ReactNode }) {
  const user = useQuery(api.users.getUser);
  if (user?.deactivatedAt === undefined) return children;
  return <DeactivatedAccount deletionAt={user.deletionAt} />;
}

/**
 * Says when the account is deleted, with the ways on: reactivate it, delete
 * it now, or sign out.
 */
function DeactivatedAccount({ deletionAt }: { deletionAt?: number }) {
  const t = useI18n();
  const { date } = useFormatters();
  const signOut = useSignOut();
  const reactivate = useMutation(api.account.closing.reactivate);
  const deleteAccount = useAction(api.account.deletion.deleteAccount);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex w-full justify-center p-4 pt-16">
      <section
        aria-labelledby="deactivated-title"
        className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-card p-5"
      >
        <h1 id="deactivated-title" className="text-base font-medium">
          {t("deactivated.title")}
        </h1>
        <p className="text-ui text-muted-foreground">
          {t("deactivated.description", {
            date: deletionAt === undefined ? "" : date(deletionAt),
          })}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            disabled={reactivating}
            onClick={async () => {
              setFailed(false);
              setReactivating(true);
              try {
                await reactivate({});
              } catch {
                setFailed(true);
              } finally {
                setReactivating(false);
              }
            }}
          >
            {reactivating && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {t("deactivated.reactivate")}
          </Button>
          <Button variant="outline" onClick={() => setDeleting(true)}>
            {t("deactivated.deleteNow")}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            {t("account.danger.signOut")}
          </Button>
        </div>
        {failed && (
          <p role="alert" className="text-xs text-destructive">
            {t("deactivated.failed")}
          </p>
        )}
      </section>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deactivated.deleteNowTitle")}
        description={t("deactivated.deleteNowDescription")}
        confirmLabel={t("deactivated.deleteNow")}
        cancelLabel={t("deactivated.cancel")}
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
      />
    </div>
  );
}
