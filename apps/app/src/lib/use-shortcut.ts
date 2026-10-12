"use client";

import { useEffect, useRef } from "react";
import { type PageNow, shortcutFires } from "./shortcuts";

/** Whether a key press lands in a text field. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** What has the keyboard as `event` arrives. */
function pageNow(event: KeyboardEvent): PageNow {
  return {
    typing: isTyping(event.target),
    // A dialog or menu that's still fading out doesn't count.
    dialogOpen:
      document.querySelector(
        '[role=dialog][data-state="open"],[role=alertdialog][data-state="open"]',
      ) !== null,
    menuOpen:
      (event.target instanceof Element &&
        event.target.closest("[role=menu],[role=listbox]") !== null) ||
      document.querySelector(
        '[role=menu][data-state="open"],[role=listbox][data-state="open"]',
      ) !== null,
  };
}

/**
 * A keyboard shortcut anywhere on the page: pressing `shortcut` ("c", "/",
 * "ArrowLeft", "mod+Enter"; see `shortcutFires`) runs `action`, unless someone
 * is typing, a dialog is open or a menu is open. Only while `enabled`.
 */
export function useShortcut(
  shortcut: string,
  action: () => void,
  enabled = true,
) {
  // The latest action, so a new one each render doesn't re-listen.
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shortcutFires(shortcut, event, pageNow(event))) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, enabled]);
}
