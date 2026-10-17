"use client";

import {
  type Palette,
  defaultPalette,
  isPalette,
  paletteStorageKey,
  palettes,
  storedPalette,
} from "@/lib/palettes";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Puts the stored palette on the html element. Runs inline while the page's
 * HTML is parsed, before anything paints, so it can't use imports.
 */
function applyStoredPalette(storageKey: string, offered: readonly string[]) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored && offered.includes(stored)) {
      document.documentElement.setAttribute("data-palette", stored);
    }
  } catch {}
}

/** Fired on the window when this page's palette changes. */
const paletteChange = "coinslite:palette-change";

function apply(palette: Palette) {
  // As next-themes' disableTransitionOnChange: colours switch at once,
  // without every element's own colour transition running.
  const pause = document.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(pause);
  document.documentElement.setAttribute("data-palette", palette);
  window.getComputedStyle(document.body);
  setTimeout(() => pause.remove(), 1);
  window.dispatchEvent(new Event(paletteChange));
}

/** Uses a palette on this page and keeps it in this browser. */
export function setPalette(palette: Palette) {
  try {
    window.localStorage.setItem(paletteStorageKey, palette);
  } catch {}
  apply(palette);
}

function subscribe(change: () => void) {
  window.addEventListener(paletteChange, change);
  return () => window.removeEventListener(paletteChange, change);
}

function currentPalette(): Palette {
  const value = document.documentElement.getAttribute("data-palette");
  return isPalette(value) ? value : defaultPalette;
}

/** The palette in use; undefined until hydrated, as only the browser knows. */
export function usePalette() {
  return useSyncExternalStore(subscribe, currentPalette, () => undefined);
}

/**
 * The stored palette, put on the page before it paints, and kept in step
 * with the other tabs. The html element is the source of truth, not React
 * state: with Cache Components each language's layout stays mounted, hidden,
 * and state kept there would be stale when it shows again (docs/adr/0004).
 */
export function PaletteScript() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === paletteStorageKey) {
        apply(storedPalette() ?? defaultPalette);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return (
    <script
      // Inert outside the server, as in ThemeProvider: the script only has to
      // run while the browser parses the page's HTML.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: our own constant code, as next-themes does for the appearance.
      dangerouslySetInnerHTML={{
        __html: `(${applyStoredPalette.toString()})(${JSON.stringify(paletteStorageKey)},${JSON.stringify(palettes)})`,
      }}
    />
  );
}
