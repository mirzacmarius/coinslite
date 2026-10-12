"use client";

import { hasUnsavedInput, onUnsavedInputChange } from "@/lib/unsaved-input";
import { useEffect } from "react";

const askBeforeLeaving = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  // Older browsers only ask when this is set.
  event.returnValue = "";
};

/**
 * Has the browser ask before the tab closes or the page reloads while a form
 * holds unsaved input. The listener is only there while it's needed: some
 * browsers don't keep a page with one in the back/forward cache.
 */
export function LeavePageGuard() {
  useEffect(() => {
    const update = () => {
      if (hasUnsavedInput())
        window.addEventListener("beforeunload", askBeforeLeaving);
      else window.removeEventListener("beforeunload", askBeforeLeaving);
    };
    update();
    const stopListening = onUnsavedInputChange(update);
    return () => {
      stopListening();
      window.removeEventListener("beforeunload", askBeforeLeaving);
    };
  }, []);
  return null;
}
