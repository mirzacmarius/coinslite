"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { EmptyState } from "@coinslite/ui/empty-state";
import { useQuery } from "convex/react";
import { BookOpen, Flag, Layers } from "lucide-react";
import type * as React from "react";
import { CatalogHeader } from "./catalog-header";
import { catalogNodeHref } from "./catalog-levels";
import { CatalogRow, IconTile, RowCount, RowsSkeleton } from "./catalog-rows";
import { useCatalogFormat } from "./use-catalog-format";

/** The top of the Catalog: its countries and Themes, most entries first. */
export function CatalogPage({ actions }: { actions?: React.ReactNode }) {
  const t = useI18n();
  const roots = useQuery(api.catalog.browse.roots);
  const { nodeTitle } = useCatalogFormat();

  return (
    <>
      <CatalogHeader title={t("nav.catalog")} actions={actions} />
      {roots === undefined ? (
        <RowsSkeleton />
      ) : roots.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={
              <BookOpen
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalog.emptyTitle")}
            description={t("catalog.emptyDescription")}
          />
        </div>
      ) : (
        <ul className="divide-y border-b">
          {roots.map((root) => (
            <CatalogRow
              key={root.key}
              href={catalogNodeHref(root.key)}
              tile={<IconTile icon={root.kind === "theme" ? Layers : Flag} />}
              title={nodeTitle(root)}
              facts={root.kind === "theme" ? t("catalog.theme") : undefined}
              end={
                <RowCount
                  label={t("catalog.entryCount")}
                  count={root.entryCount}
                />
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
