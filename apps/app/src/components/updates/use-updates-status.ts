"use client";

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
  return useQuery(api.updates.status, { language });
}
