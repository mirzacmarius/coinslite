"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useCurrentLocale } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";

/**
 * Whether there's a release the person hasn't seen in Updates yet, and the
 * highlights of a new one to show them once. Undefined while loading, null
 * when signed out or not set up.
 */
export function useUpdatesStatus() {
  const language = useCurrentLocale();
  const status = useQuery(api.updates.status, { language });
  // The shell and the Account page share this query; see useHydrated.
  return useHydrated() ? status : undefined;
}
