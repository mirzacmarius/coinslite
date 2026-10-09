"use client";

import type {
  CatalogItemType,
  PreciousMetal,
} from "@coinslite/backend/convex/catalog/fields";
import { useEffect, useState } from "react";

/**
 * The Catalog entries a person picked last when adding Items, up to six per
 * Item type, remembered on this device (spec 6.2). Each keeps what its row
 * shows, so the list needs no request.
 */

export type PickedCatalogEntry = {
  key: string;
  title: string;
  itemType: CatalogItemType;
  country?: string;
  denomination?: string;
  yearFrom?: number;
  yearTo?: number;
  metal?: PreciousMetal;
};

const recentLimit = 6;
const storageKey = (itemType: CatalogItemType) =>
  `coinslite:catalog-recent:${itemType}`;

const isPicked = (value: unknown): value is PickedCatalogEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PickedCatalogEntry).key === "string" &&
  typeof (value as PickedCatalogEntry).title === "string";

function readRecent(itemType: CatalogItemType): PickedCatalogEntry[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(storageKey(itemType)) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter(isPicked).slice(0, recentLimit)
      : [];
  } catch {
    // Storage may be unavailable (private browsing) or hold something else.
    return [];
  }
}

/** Puts an entry first among its Item type's recently picked. */
export function rememberPicked(entry: PickedCatalogEntry) {
  const kept: PickedCatalogEntry = {
    key: entry.key,
    title: entry.title,
    itemType: entry.itemType,
    country: entry.country,
    denomination: entry.denomination,
    yearFrom: entry.yearFrom,
    yearTo: entry.yearTo,
    metal: entry.metal,
  };
  const recent = [
    kept,
    ...readRecent(entry.itemType).filter(({ key }) => key !== entry.key),
  ].slice(0, recentLimit);
  try {
    localStorage.setItem(storageKey(entry.itemType), JSON.stringify(recent));
  } catch {
    // Not remembering is fine.
  }
}

/** The Item type's recently picked entries, newest first; empty until read on the device. */
export function useRecentCatalogEntries(itemType: CatalogItemType) {
  const [recent, setRecent] = useState<PickedCatalogEntry[]>([]);
  useEffect(() => setRecent(readRecent(itemType)), [itemType]);
  return recent;
}
