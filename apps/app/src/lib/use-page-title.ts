"use client";

import { useEffect } from "react";

/** The shell's title while a page shows its own name in the tab. */
let shellTitle: string | undefined;

/**
 * The page's title as the shell gives it, naming only the section
 * ("Collection"), never the Item or Album the tab may name: what usage
 * statistics may send (docs/adr/0006).
 */
export function sectionTitle() {
  return shellTitle ?? document.title;
}

/**
 * Names the browser tab after what a page shows, such as "1 krone 1875 ·
 * Collection", once its data is in: the prerendered shell (ADR 0004) only
 * knows the section. Leaving the page puts the shell's title back, unless
 * the next page has already set its own.
 */
export function usePageTitle(name: string | undefined, section: string) {
  useEffect(() => {
    if (!name) return;
    const before = document.title;
    const title = `${name} · ${section}`;
    shellTitle = before;
    document.title = title;
    return () => {
      shellTitle = undefined;
      if (document.title === title) document.title = before;
    };
  }, [name, section]);
}
