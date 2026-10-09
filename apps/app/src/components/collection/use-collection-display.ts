"use client";

import {
  type PageSize,
  defaultPageSize,
  pageSizes,
} from "@coinslite/backend/convex/collection/view";
import { useCallback, useSyncExternalStore } from "react";

/** How the Collection is laid out: rows or cards. */
export const collectionLayouts = ["list", "grid"] as const;
export type CollectionLayout = (typeof collectionLayouts)[number];

export type CollectionDisplay = {
  layout: CollectionLayout;
  pageSize: PageSize;
};

const storageKey = "collection.display";
const changed = "collection-display-change";
const defaults: CollectionDisplay = {
  layout: "list",
  pageSize: defaultPageSize,
};

/** What this device remembers, or the defaults; never throws. */
function read(stored: string | null): CollectionDisplay {
  try {
    const value = JSON.parse(stored ?? "{}") as Partial<CollectionDisplay>;
    return {
      layout: collectionLayouts.includes(value.layout as CollectionLayout)
        ? (value.layout as CollectionLayout)
        : defaults.layout,
      pageSize: pageSizes.includes(value.pageSize as PageSize)
        ? (value.pageSize as PageSize)
        : defaults.pageSize,
    };
  } catch {
    return defaults;
  }
}

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
 * The Collection's layout and page size, remembered on this device (spec 7).
 * The server and the first paint use the defaults.
 */
export function useCollectionDisplay() {
  const stored = useSyncExternalStore(subscribe, storedValue, () => null);
  const display = read(stored);
  const change = useCallback((next: Partial<CollectionDisplay>) => {
    const value = { ...read(storedValue()), ...next };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage can be refused (private browsing); the choice then isn't kept.
    }
    window.dispatchEvent(new Event(changed));
  }, []);
  return [display, change] as const;
}
