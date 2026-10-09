"use client";

import { useI18n } from "@/locales/client";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { BookOpen } from "lucide-react";
import type * as React from "react";
import { useCatalogVisible } from "./use-catalog-visible";

/**
 * The Catalog's pages, for whoever sees the Catalog. While an admin has
 * hidden it, everyone else finds a short note here instead (a bookmark or an
 * old link still leads somewhere).
 */
export function CatalogGate({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  if (useCatalogVisible() !== false) return children;
  return (
    <>
      <HeaderBar title={t("nav.catalog")} />
      <div className="p-4">
        <EmptyState
          icon={
            <BookOpen
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={t("featureFlags.catalogHiddenTitle")}
          description={t("featureFlags.catalogHiddenDescription")}
        />
      </div>
    </>
  );
}
