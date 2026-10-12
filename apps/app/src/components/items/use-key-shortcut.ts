"use client";

import { useEffect, useRef } from "react";
import { isTyping } from "./add-item";

/**
 * A single-key shortcut, such as E for Edit: pressing `key` (a lower-case
 * letter) runs `action`, unless someone is typing, a dialog or menu is open,
 * or a modifier key is held. Only while `enabled`.
 */
export function useKeyShortcut(
  key: string,
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
      if (
        event.key.toLowerCase() !== key ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target) ||
        // A dialog that's still fading out doesn't count.
        document.querySelector(
          '[role=dialog][data-state="open"],[role=alertdialog][data-state="open"]',
        ) ||
        (event.target instanceof Element &&
          event.target.closest("[role=menu],[role=listbox]"))
      )
        return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
