"use client";

import { usePageTitle } from "@/lib/use-page-title";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

/**
 * Names the Item page's tab after the Item ("1 krone 1875 · Collection"),
 * or with `editing` its Edit Item page's ("1 krone 1875 · Edit Item"). It
 * asks for the Item as the page does, so the answer is shared.
 */
export function ItemPageTitle({ editing = false }: { editing?: boolean }) {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  usePageTitle(item?.title, t(editing ? "items.editItem" : "nav.collection"));
  return null;
}
