"use client";

import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  feedbackErrors,
  feedbackLimits,
} from "@coinslite/backend/convex/feedback/rules";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { IconButton } from "@coinslite/ui/icon-button";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { toast } from "@coinslite/ui/toaster";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ChevronRight,
  Loader2,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";
import { useId, useRef, useState } from "react";

const messageInput =
  "w-full resize-none bg-transparent px-0 text-base placeholder:text-muted-foreground focus:outline-none md:text-sm";

/**
 * Account's "Send feedback" button and the compact dialog it opens. The draft
 * outlives the dialog, so closing it by accident loses nothing.
 */
export function SendFeedback() {
  const t = useI18n();
  const { number } = useFormatters();
  const mod = useModifierKey();
  const id = useId();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sendFeedback = useMutation(api.feedback.send);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [sending, setSending] = useState(false);
  const blank = message.trim() === "";
  // A new deployment waits while a message is half written.
  useUnsavedInput(!blank);
  const error = attempted && blank ? t("feedback.required") : failure;

  const failureMessage = (code: string) => {
    switch (code) {
      case feedbackErrors.messageRequired:
        return t("feedback.required");
      case feedbackErrors.tooLong:
        return t("feedback.tooLong", {
          limit: number(feedbackLimits.message),
        });
      case feedbackErrors.tooManyRequests:
        return t("feedback.tooMany");
      default:
        return t("feedback.failed");
    }
  };

  const send = async () => {
    if (sending) return;
    setAttempted(true);
    setFailure(undefined);
    if (blank) return;
    setSending(true);
    try {
      await sendFeedback({ message });
    } catch (caught) {
      setFailure(
        failureMessage(
          caught instanceof ConvexError ? String(caught.data) : "",
        ),
      );
      return;
    } finally {
      setSending(false);
    }
    setMessage("");
    setAttempted(false);
    setOpen(false);
    toast.success(t("feedback.sent"));
  };

  return (
    <>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <MessageSquare strokeWidth={1.75} aria-hidden="true" />
        {t("feedback.open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            messageRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-1 text-ui text-muted-foreground">
              <UserRound
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{t("nav.account")}</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {t("feedback.dialogTitle")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton
                type="button"
                label={t("feedback.close")}
                shortcut="Esc"
              >
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
            <textarea
              ref={messageRef}
              aria-label={t("feedback.message")}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              rows={6}
              maxLength={feedbackLimits.message}
              placeholder={t("feedback.placeholder")}
              className={messageInput}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <DialogDescription className="text-xs">
              {t("feedback.note")}
            </DialogDescription>
            {error && (
              <p
                id={`${id}-error`}
                role="alert"
                className="text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("feedback.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={sending}
              onClick={() => void send()}
            >
              {sending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              {t("feedback.send")}
              {mod && (
                <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                  {mod}↵
                </Kbd>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
