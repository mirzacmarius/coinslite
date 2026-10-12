"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type CollectionDisplay,
  type ViewportSize,
  readDisplay,
} from "./collection-display";

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

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** The last size read, so an unchanged viewport gives the same object. */
let lastSize: ViewportSize | undefined;

function viewportSize() {
  const { innerWidth: width, innerHeight: height } = window;
  if (lastSize?.width !== width || lastSize.height !== height)
    lastSize = { width, height };
  return lastSize;
}

/**
 * The viewport's size, kept current as the window resizes; undefined on the
 * server and the first paint.
 */
export function useViewportSize() {
  return useSyncExternalStore<ViewportSize | undefined>(
    subscribeToResize,
    viewportSize,
    () => undefined,
  );
}
