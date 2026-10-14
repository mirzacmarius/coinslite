"use client";

import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * Leaving a page whose form holds unsaved input asks "Discard changes?"
 * first, as closing a form dialog does: `leave(href)` from the page's own
 * Cancel, and any click on a link to another page of the app while
 * `changed`. Discard goes on; Keep editing puts the focus back in the form
 * (`within`), where it last was. Closing the tab or reloading asks through
 * the browser (LeavePageGuard); the browser's Back doesn't ask.
 *
 * `leave` replaces the page in the history, so Back doesn't return to a
 * form given up on. Returns it and the question, for the page to render.
 */
export function useLeaveGuard(
  changed: boolean,
  within: React.RefObject<HTMLElement | null>,
) {
  const router = useRouter();
  // Where the person asked to go, while the question is open.
  const [leaving, setLeaving] = useState<{ href: string; replace: boolean }>();
  // The form's field that last had the focus, to return to on Keep editing.
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const form = within.current;
    if (!form) return;
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement)
        lastFocused.current = event.target;
    };
    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, [within]);
  useEffect(() => {
    if (!changed) return;
    // Before React's handlers: Next.js's Link skips a click already prevented.
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
      setLeaving({
        href: `${url.pathname}${url.search}${url.hash}`,
        replace: false,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [changed]);
  const go = ({ href, replace }: { href: string; replace: boolean }) => {
    if (replace) router.replace(href);
    else router.push(href);
  };
  const leave = (href: string) => {
    if (changed) setLeaving({ href, replace: true });
    else go({ href, replace: true });
  };
  const question = (
    <DiscardChangesDialog
      open={leaving !== undefined}
      onOpenChange={(open) => {
        if (open) return;
        setLeaving(undefined);
        // Kept editing: back to the field, so typing and Cmd/Ctrl+Enter reach the form.
        const target = lastFocused.current;
        requestAnimationFrame(() => {
          if (target?.isConnected) target.focus();
        });
      }}
      onDiscard={() => {
        if (leaving) go(leaving);
      }}
    />
  );
  return { leave, question };
}
