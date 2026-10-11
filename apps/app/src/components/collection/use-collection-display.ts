"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type CollectionDisplay, readDisplay } from "./collection-display";

const storageKey = "collection.display";
const changed = "collection-display-change";

function storedValue() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changed, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changed, onChange);
  };
}

/**
 * The Collection's layout, page size and open or collapsed totals,
 * remembered on this device (spec 7). The server and the first paint use
 * the defaults.
 */
export function useCollectionDisplay() {
  const stored = useSyncExternalStore(subscribe, storedValue, () => null);
  const display = readDisplay(stored);
  const change = useCallback((next: Partial<CollectionDisplay>) => {
    const value = { ...readDisplay(storedValue()), ...next };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage can be refused (private browsing); the choice then isn't kept.
    }
    window.dispatchEvent(new Event(changed));
  }, []);
  return [display, change] as const;
}

/** Narrower than Tailwind's `sm` breakpoint. */
const phoneQuery = "(max-width: 639.98px)";

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(phoneQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the screen is phone-sized; undefined on the server and the first paint. */
export function usePhoneWidth() {
  return useSyncExternalStore<boolean | undefined>(
    subscribeToWidth,
    () => window.matchMedia(phoneQuery).matches,
    () => undefined,
  );
}
