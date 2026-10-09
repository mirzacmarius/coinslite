"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";

/**
 * Whether the signed-in person sees the Catalog (admins always do; everyone
 * else unless an admin has hidden it). Undefined while loading. The backend
 * enforces it too: a hidden Catalog returns nothing to them.
 */
export function useCatalogVisible() {
  const visible = useQuery(api.featureFlags.isCatalogVisible);
  // The app shell's navigation asks too; see useHydrated.
  return useHydrated() ? visible : undefined;
}
