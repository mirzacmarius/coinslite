"use client";

import { useEffect } from "react";

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
    document.title = title;
    return () => {
      if (document.title === title) document.title = before;
    };
  }, [name, section]);
}
