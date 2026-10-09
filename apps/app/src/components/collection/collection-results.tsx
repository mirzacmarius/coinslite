"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { itemTypeIcons } from "@/components/items/item-fields";
import { ItemThumbnail } from "@/components/items/item-thumbnail";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { Button } from "@coinslite/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { BrowseResult } from "./filter-options";
import type { CollectionLayout } from "./use-collection-display";

type Item = BrowseResult["items"][number];

/** What a row or card says about an Item besides its title. */
function useItemFacts(currency: BrowseResult["currency"]) {
  const labels = useGradeLabels();
  const format = useFormatters();
  return (item: Item) => ({
    facts: [
      item.year === undefined ? undefined : String(item.year),
      item.denomination,
      item.country && format.country(item.country),
    ].filter(Boolean) as string[],
    grade:
      item.grade !== undefined && item.gradingScale
        ? labels.grade(item.gradingScale, item.grade, item.strike)
        : undefined,
    // Proof and BU are worth naming beside the title; circulation is the norm.
    strike:
      item.strike && item.strike !== "circulation"
        ? labels.strike(item.strike)
        : undefined,
    purchasePrice:
      item.purchasePrice === undefined
        ? undefined
        : format.money(item.purchasePrice, currency),
    marketValue:
      item.marketValue === undefined
        ? undefined
        : format.money(item.marketValue, currency),
  });
}

/** One page of Items as rows or as cards, each opening its Item detail. */
export function CollectionResults({
  result,
  layout,
}: {
  result: BrowseResult;
  layout: CollectionLayout;
}) {
  return layout === "grid" ? (
    <ItemGrid result={result} />
  ) : (
    <ItemList result={result} />
  );
}

function ItemList({ result }: { result: BrowseResult }) {
  const t = useI18n();
  const describe = useItemFacts(result.currency);
  return (
    <div>
      {/* Names the columns on the right; rows read on their own on phones. */}
      <div
        aria-hidden="true"
        className="hidden h-8 items-center gap-3 border-b px-4 text-xs text-muted-foreground md:flex"
      >
        <span className="flex-1" />
        <span className="w-24 text-right">{t("items.grade")}</span>
        <span className="w-16 text-right">{t("items.quantity")}</span>
        <span className="hidden w-28 text-right lg:block">
          {t("items.purchasePrice")}
        </span>
        <span className="hidden w-28 text-right lg:block">
          {t("items.marketValue")}
        </span>
      </div>
      <ul className="divide-y border-b">
        {result.items.map((item) => {
          const about = describe(item);
          return (
            <li key={item._id}>
              <Link
                href={`/collection/${item._id}`}
                className="flex min-h-11 items-center gap-3 px-4 py-1.5 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted"
              >
                <ItemThumbnail type={item.type} url={item.thumbnailUrl} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {item.title}
                    {about.strike && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {about.strike}
                      </span>
                    )}
                  </span>
                  {about.facts.length > 0 && (
                    <span className="truncate text-xs text-muted-foreground">
                      {about.facts.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="hidden w-24 truncate text-right text-xs text-muted-foreground md:block">
                  {about.grade && (
                    <>
                      <span className="sr-only">{t("items.grade")} </span>
                      {about.grade}
                    </>
                  )}
                </span>
                <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground md:w-16">
                  {item.quantity > 1 && (
                    <>
                      <span className="sr-only">{t("items.quantity")} </span>×
                      {item.quantity}
                    </>
                  )}
                </span>
                <Amount label={t("items.purchasePrice")}>
                  {about.purchasePrice}
                </Amount>
                <Amount label={t("items.marketValue")}>
                  {about.marketValue}
                </Amount>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Amount({ label, children }: { label: string; children?: string }) {
  return (
    <span className="hidden w-28 truncate text-right text-[13px] tabular-nums lg:block">
      {children && (
        <>
          <span className="sr-only">{label} </span>
          {children}
        </>
      )}
    </span>
  );
}

function ItemGrid({ result }: { result: BrowseResult }) {
  const t = useI18n();
  const describe = useItemFacts(result.currency);
  return (
    <ul className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {result.items.map((item) => {
        const about = describe(item);
        const TypeIcon = itemTypeIcons[item.type];
        return (
          <li key={item._id} className="min-w-0">
            <Link
              href={`/collection/${item._id}`}
              className="flex h-full flex-col overflow-hidden rounded-lg border bg-card outline-none transition-colors duration-100 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full border-b bg-muted object-cover"
                />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center border-b bg-muted text-muted-foreground">
                  <TypeIcon
                    className="size-6"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-0.5 p-2.5">
                <span className="truncate text-[13px] font-medium">
                  {item.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {about.facts.join(" · ") || " "}
                </span>
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {about.grade}
                    {item.quantity > 1 && (
                      <span className="tabular-nums">
                        {about.grade && " · "}
                        <span className="sr-only">{t("items.quantity")} </span>×
                        {item.quantity}
                      </span>
                    )}
                  </span>
                  {about.marketValue && (
                    <span className="shrink-0 tabular-nums text-foreground">
                      <span className="sr-only">{t("items.marketValue")} </span>
                      {about.marketValue}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** "26–50 of 134" and the previous and next page. */
export function Pagination({
  result,
  pageSize,
  onPageChange,
}: {
  result: BrowseResult;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const t = useI18n();
  const format = useFormatters();
  const from = (result.page - 1) * pageSize + 1;
  const to = from + result.items.length - 1;
  return (
    <nav
      aria-label={t("collection.pagination")}
      className="flex h-10 items-center justify-between px-4 text-xs text-muted-foreground"
    >
      <span className="tabular-nums">
        {t("collection.range", {
          from: format.number(from),
          to: format.number(to),
          total: format.number(result.total),
        })}
      </span>
      {result.pageCount > 1 && (
        <span className="flex items-center gap-1">
          <PageButton
            label={t("collection.previousPage")}
            disabled={result.page <= 1}
            onClick={() => onPageChange(result.page - 1)}
          >
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </PageButton>
          <span className="px-1 tabular-nums">
            {t("collection.pageOf", {
              page: format.number(result.page),
              pages: format.number(result.pageCount),
            })}
          </span>
          <PageButton
            label={t("collection.nextPage")}
            disabled={result.page >= result.pageCount}
            onClick={() => onPageChange(result.page + 1)}
          >
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </PageButton>
        </span>
      )}
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button gets no pointer events, so the tooltip needs a wrapper. */}
        <span className={cn(disabled && "cursor-not-allowed")}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Rows in the list's rhythm while the first page loads. */
export function ResultsSkeleton() {
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
