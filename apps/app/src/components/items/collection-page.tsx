"use client";

import { CollectionTotalsSection } from "@/components/collection-totals/collection-totals";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { formatCountry } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { usePaginatedQuery } from "convex/react";
import { Coins, Plus } from "lucide-react";
import Link from "next/link";
import { useAddItem } from "./add-item";
import { useGradeLabels } from "./grade-labels";
import { ItemThumbnail } from "./item-thumbnail";

const PAGE_SIZE = 25;

/** The Collection: every Item the person owns, newest first. */
export function CollectionPage() {
  const t = useI18n();
  const labels = useGradeLabels();
  const locale = useCurrentLocale();
  const addItem = useAddItem();
  const { results, status, loadMore } = usePaginatedQuery(
    api.items.list,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <>
      <HeaderBar
        title={t("nav.collection")}
        actions={
          <Button size="xs" onClick={addItem}>
            <Plus aria-hidden="true" />
            {t("items.add")}
          </Button>
        }
      />
      <CollectionTotalsSection />
      {status === "LoadingFirstPage" ? (
        <ListSkeleton />
      ) : results.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={
              <Coins className="size-4" strokeWidth={1.75} aria-hidden="true" />
            }
            title={t("items.emptyTitle")}
            description={t("items.emptyDescription")}
            action={<Button onClick={addItem}>{t("items.add")}</Button>}
          />
        </div>
      ) : (
        <>
          <ul className="divide-y border-b">
            {results.map((item) => {
              const facts = [
                item.year,
                item.denomination,
                item.country && formatCountry(item.country, locale),
                item.grade &&
                  item.gradingScale &&
                  labels.grade(item.gradingScale, item.grade, item.strike),
              ].filter(Boolean);
              return (
                <li key={item._id}>
                  <Link
                    href={`/collection/${item._id}`}
                    className="flex min-h-11 items-center gap-3 px-4 py-1.5 outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted"
                  >
                    <ItemThumbnail type={item.type} url={item.thumbnailUrl} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium">
                        {item.title}
                      </span>
                      {facts.length > 0 && (
                        <span className="truncate text-xs text-muted-foreground">
                          {facts.join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      <span className="sr-only">{t("items.quantity")} </span>×
                      {item.quantity}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {status === "CanLoadMore" && (
            <div className="p-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => loadMore(PAGE_SIZE)}
              >
                {t("items.showMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y border-b" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex min-h-11 items-center gap-3 px-4 py-1.5">
          <span className="size-8 animate-pulse rounded-md bg-muted" />
          <span className="h-3.5 w-48 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
