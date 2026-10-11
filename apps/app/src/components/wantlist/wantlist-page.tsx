"use client";

import { CatalogHeader } from "@/components/catalog/catalog-header";
import {
  catalogHref,
  catalogNodeHref,
} from "@/components/catalog/catalog-levels";
import {
  EntryTile,
  HeldCount,
  RowsSkeleton,
  useOwnCountry,
} from "@/components/catalog/catalog-rows";
import { QuickAdd } from "@/components/catalog/quick-add";
import {
  type CatalogEntryRow,
  useCatalogFormat,
} from "@/components/catalog/use-catalog-format";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { EmptyState } from "@coinslite/ui/empty-state";
import { IconButton } from "@coinslite/ui/icon-button";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Heart, X } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useSetWanted } from "./wantlist";

type WantlistGroup = FunctionReturnType<typeof api.wants.list>[number];

/**
 * The Wantlist: the Catalog entries the person wants, by country and then
 * series as the Catalog lists them. Each row adds an Item in one step (the
 * want clears, so the row goes) or comes off the list.
 */
export function WantlistPage({ actions }: { actions?: React.ReactNode }) {
  const t = useI18n();
  const format = useFormatters();
  const groups = useQuery(api.wants.list, {});
  const header = (
    <CatalogHeader crumbs={[]} title={t("wantlist.title")} actions={actions} />
  );
  if (groups === undefined) {
    return (
      <>
        {header}
        <RowsSkeleton />
      </>
    );
  }
  if (groups.length === 0) {
    return (
      <>
        {header}
        <div className="p-4">
          <EmptyState
            icon={
              <Heart className="size-4" strokeWidth={1.75} aria-hidden="true" />
            }
            title={t("wantlist.emptyTitle")}
            description={t("wantlist.emptyDescription")}
            action={
              <Link
                href={catalogHref}
                className="text-[13px] font-medium text-link hover:underline"
              >
                {t("wantlist.browseCatalog")}
              </Link>
            }
          />
        </div>
      </>
    );
  }
  const countryLabel = (group: WantlistGroup) =>
    group.country ? format.country(group.country) : group.title;
  return (
    <>
      {header}
      <div className="border-b">
        {groups.map((group) => (
          <section key={group.key} aria-label={countryLabel(group)}>
            <h2 className="sticky top-10 z-10 flex h-8 items-center border-b bg-background/95 px-4 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="truncate">{countryLabel(group)}</span>
            </h2>
            {group.series.map(({ series, entries }) => (
              <ul key={series ?? ""} className="divide-y">
                {(series !== null || group.series.length > 1) && (
                  <li className="flex h-8 items-center px-4 text-xs text-muted-foreground">
                    {series ?? t("catalog.noSeries")}
                  </li>
                )}
                {entries.map((entry) => (
                  <WantedEntryRow key={entry.key} entry={entry} />
                ))}
              </ul>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

/** One wanted entry: the way to its page, how many the person holds, quick add and remove. */
function WantedEntryRow({ entry }: { entry: CatalogEntryRow }) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const ownCountry = useOwnCountry();
  const setWanted = useSetWanted();
  const suffix = catalogFormat.strikeSuffix(entry);
  const facts = catalogFormat.rowFacts(entry, ownCountry).join(" · ");
  return (
    <li className="flex min-h-11 items-center gap-3 px-4 py-1.5">
      <Link
        href={catalogNodeHref(entry.key)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <EntryTile entry={entry} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">
            {entry.title}
            {suffix && (
              <span className="font-normal text-muted-foreground">
                {" · "}
                {suffix}
              </span>
            )}
          </span>
          {facts && (
            <span className="truncate text-xs text-muted-foreground">
              {facts}
            </span>
          )}
          {entry.imageCredit && (
            <span className="truncate text-xs text-muted-foreground">
              {`${t("catalog.imageCredit")} · ${catalogFormat.credit(entry.imageCredit)}`}
            </span>
          )}
        </span>
      </Link>
      <HeldCount held={entry.held} more={entry.heldMore} />
      <QuickAdd entry={entry} />
      <IconButton
        type="button"
        label={t("wantlist.removeEntry", { title: entry.title })}
        onClick={() => void setWanted(entry.key, false)}
      >
        <X />
      </IconButton>
    </li>
  );
}
