"use client";

import { useI18n } from "@/locales/client";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Leaving a page whose form holds unsaved input asks "Discard changes?"
 * first, as closing a form dialog does: `leave(href)` from the page's own
 * Cancel, and any click on a link to another page of the app while
 * `changed`. Discard goes on; Keep editing stays. Closing the tab or
 * reloading asks through the browser (LeavePageGuard).
 *
 * Returns `leave` and the question, for the page to render.
 */
export function useLeaveGuard(changed: boolean) {
  const t = useI18n();
  const router = useRouter();
  // Where the person asked to go, while the question is open.
  const [leavingTo, setLeavingTo] = useState<string>();
  useEffect(() => {
    if (!changed) return;
    // Before Next.js's own link handling, which sees the click as prevented.
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      setLeavingTo(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [changed]);
  const leave = (href: string) => {
    if (changed) setLeavingTo(href);
    else router.push(href);
  };
  const question = (
    <ConfirmDialog
      open={leavingTo !== undefined}
      onOpenChange={(open) => {
        if (!open) setLeavingTo(undefined);
      }}
      title={t("discardChanges.title")}
      description={t("discardChanges.description")}
      confirmLabel={t("discardChanges.discard")}
      cancelLabel={t("discardChanges.keepEditing")}
      destructive
      onConfirm={() => {
        if (leavingTo !== undefined) router.push(leavingTo);
      }}
    />
  );
  return { leave, question };
}
