"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { albumErrors } from "@coinslite/backend/convex/albums/rules";
import { shareErrors, shareLink } from "@coinslite/backend/convex/shares/rules";
import type { ShareTarget } from "@coinslite/backend/convex/utils/validators";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { ActionLabel } from "@coinslite/ui/header-bar";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import { Switch } from "@coinslite/ui/switch";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Copy, Loader2, Share2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

/**
 * The Share action of an Album or Set page (spec §8): opens the Share
 * dialog for `target`, afresh each time.
 */
export function ShareButton({
  target,
  name,
}: {
  target: ShareTarget;
  /** What's shared, as the dialog names it: the Album's name, the Set's title. */
  name: string;
}) {
  const t = useI18n();
  const [dialog, setDialog] = useState({ open: false, key: 0 });
  return (
    <>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setDialog(({ key }) => ({ open: true, key: key + 1 }))}
      >
        <Share2 strokeWidth={1.75} aria-hidden="true" />
        <ActionLabel>{t("share.share")}</ActionLabel>
      </Button>
      <ShareDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog(({ key }) => ({ open, key }))}
        target={target}
        name={name}
      />
    </>
  );
}

/** The app's address, for the link; empty where there's no browser yet. */
const origin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

/**
 * Sharing one Album or Set: what the shared page shows, then the link with
 * Copy, the switch for Market values (an Album's), and Stop sharing. Until
 * it's shared, a button makes the link.
 */
export function ShareDialog({
  open,
  onOpenChange,
  target,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ShareTarget;
  name: string;
}) {
  const t = useI18n();
  const shareError = useShareError();
  const share = useQuery(api.shares.mine, open ? { target } : "skip");
  const user = useQuery(
    api.users.getUser,
    open && target.kind === "album" ? {} : "skip",
  );
  const start = useMutation(api.shares.start);
  const setShowValues = useMutation(api.shares.setShowValues);
  const stop = useMutation(api.shares.stop);
  const linkRef = useRef<HTMLInputElement>(null);
  const switchId = useId();
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [failed, setFailed] = useState<string>();
  const link = share ? shareLink(origin(), share.token) : undefined;

  const run = async (action: () => Promise<unknown>) => {
    setFailed(undefined);
    setBusy(true);
    try {
      await action();
    } catch (failure) {
      setFailed(shareError(failure));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("share.copied"));
    } catch {
      linkRef.current?.select();
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[32rem]">
          <DialogHeader>
            <div className="flex min-w-0 items-center gap-1.5 text-ui text-muted-foreground">
              <Share2
                className="size-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <DialogTitle className="truncate text-foreground">
                {t("share.title", { name })}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("share.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
            <DialogDescription>
              {target.kind === "album"
                ? t("share.albumShows")
                : t("share.setShows")}
            </DialogDescription>
            {share === undefined ? (
              <span
                className="h-8 w-full animate-pulse rounded-md bg-muted"
                aria-hidden="true"
              />
            ) : share === null ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-ui text-muted-foreground">
                  {t("share.notShared")}
                </p>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => start({ target }))}
                >
                  {busy && (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  )}
                  {t("share.start")}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    ref={linkRef}
                    readOnly
                    value={link ?? ""}
                    aria-label={t("share.link")}
                    onFocus={(event) => event.currentTarget.select()}
                    className="font-mono text-xs md:text-xs"
                  />
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => void copy()}
                  >
                    <Copy aria-hidden="true" />
                    {t("share.copy")}
                  </Button>
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start text-ui text-link hover:underline"
                >
                  {t("share.open")}
                </a>
                {target.kind === "album" && (
                  <div className="flex items-start gap-2 pt-1">
                    <Switch
                      id={switchId}
                      checked={share.showValues}
                      disabled={busy}
                      onCheckedChange={(checked) =>
                        void run(() =>
                          setShowValues({
                            shareId: share.shareId,
                            showValues: checked,
                          }),
                        )
                      }
                      className="mt-0.5"
                    />
                    <label htmlFor={switchId} className="flex flex-col text-ui">
                      <span>{t("share.showValues")}</span>
                      {user?.homeCurrency && (
                        <span className="text-xs text-muted-foreground">
                          {t("share.showValuesHint", {
                            currency: user.homeCurrency,
                          })}
                        </span>
                      )}
                    </label>
                  </div>
                )}
              </>
            )}
            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {failed}
              </p>
            )}
          </div>
          {share && (
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setStopping(true)}
              >
                {t("share.stop")}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t("share.close")}
                </Button>
              </DialogClose>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={stopping}
        onOpenChange={setStopping}
        title={t("share.stopTitle", { name })}
        description={t("share.stopDescription")}
        confirmLabel={t("share.stop")}
        cancelLabel={t("share.cancel")}
        destructive
        onConfirm={async () => {
          if (!share) return;
          try {
            await stop({ shareId: share.shareId });
            toast.success(t("share.stopped"));
          } catch (failure) {
            toast.error(shareError(failure));
            throw failure;
          }
        }}
      />
    </>
  );
}

/** Turns a failed share call into a message. */
function useShareError() {
  const t = useI18n();
  return (failure: unknown) => {
    const code = failure instanceof ConvexError ? String(failure.data) : "";
    switch (code) {
      case albumErrors.notFound:
        return t("share.errors.ALBUM_NOT_FOUND");
      case shareErrors.notShareable:
        return t("share.errors.NOT_SHAREABLE");
      case shareErrors.notFound:
        return t("share.errors.SHARE_NOT_FOUND");
      default:
        return t("share.failed");
    }
  };
}
