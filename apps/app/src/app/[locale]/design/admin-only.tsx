"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { notFound } from "next/navigation";
import type * as React from "react";

/**
 * Shows its children to admins only. To anyone else the page doesn't exist:
 * they get the app's "not found", so the gallery stays out of public view.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The app shell asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  if (isAdmin === false) notFound();
  return isAdmin ? children : null;
}
