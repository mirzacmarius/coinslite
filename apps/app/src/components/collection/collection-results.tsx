"use client";

import { useMoney } from "@/components/account/home-currency-change";
import { useGradeLabels } from "@/components/items/grade-labels";
import { itemTypeIcons } from "@/components/items/item-fields";
import { ItemThumbnail } from "@/components/items/item-thumbnail";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { Button } from "@coinslite/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import type { CollectionLayout } from "./collection-display";
import { itemInViewHref, useCollectionUrl } from "./collection-url";
import type { BrowseResult } from "./filter-options";
import type { ItemSelection } from "./use-item-selection";

type Item = BrowseResult["items"][number];

/** What a row or card says about an Item besides its title. */
function useItemFacts(currency: BrowseResult["currency"]) {
  const labels = useGradeLabels();
  const format = useFormatters();
  const formatMoney = useMoney();
  const money = (amount: number) => formatMoney(amount, currency);
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
      item.purchasePrice === undefined ? undefined : money(item.purchasePrice),
    marketValue:
      item.marketValue === undefined ? undefined : money(item.marketValue),
  });
}

/** While select mode is on: the selection rows and cards toggle. */
type Selecting = ItemSelection | undefined;

/**
 * One page of Items as rows or as cards, each opening its Item detail; in
 * select mode, each selects its Item instead.
 */
export function CollectionResults({
  result,
  layout,
  selection,
}: {
  result: BrowseResult;
  layout: CollectionLayout;
  selection?: ItemSelection;
}) {
  return layout === "grid" ? (
    <ItemGrid result={result} selection={selection} />
  ) : (
    <ItemList result={result} selection={selection} />
  );
}

/**
 * A row or card: a link to the Item, or in select mode a checkbox for it.
 * Shift-click selects every Item from the one clicked last.
 */
function ItemTarget({
  item,
  items,
  selection,
  className,
  children,
}: {
  item: Item;
  items: readonly Item[];
  selection: Selecting;
  className: string;
  children: React.ReactNode;
}) {
  // The Item page moves through the view it was opened from.
  const { view } = useCollectionUrl();
  if (!selection)
    return (
      <Link href={itemInViewHref(item._id, view)} className={className}>
        {children}
      </Link>
    );
  const checked = selection.isSelected(item._id);
  return (
    // biome-ignore lint/a11y/useSemanticElements: the whole row toggles (shift-click selects a range); an <input> can't hold the row
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={item.title}
      onClick={(event) => selection.toggle(item, items, event.shiftKey)}
      className={cn(className, "w-full text-left", checked && "bg-muted/60")}
    >
      {children}
    </button>
  );
}

/** The box a row or card shows in select mode. */
function SelectBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={2.5} />}
    </span>
  );
}

function ItemList({
  result,
  selection,
}: {
  result: BrowseResult;
  selection: Selecting;
}) {
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
              <ItemTarget
                item={item}
                items={result.items}
                selection={selection}
                className="flex min-h-11 items-center gap-3 px-4 py-1.5 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted"
              >
                {selection && (
                  <SelectBox checked={selection.isSelected(item._id)} />
                )}
                <ItemThumbnail type={item.type} url={item.thumbnailUrl} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-ui font-medium">
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
                <PhoneFigures quantity={item.quantity} grade={about.grade} />
                <span className="hidden w-24 truncate text-right text-xs text-muted-foreground md:block">
                  {about.grade && (
                    <>
                      <span className="sr-only">{t("items.grade")} </span>
                      {about.grade}
                    </>
                  )}
                </span>
                <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
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
              </ItemTarget>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A row's figures on a phone, where there's no room for columns: × Quantity
 * when there's more than one, the Grade under it. No amounts: the totals and
 * the Item page have those, and the title gets the room.
 */
function PhoneFigures({
  quantity,
  grade,
}: {
  quantity: number;
  grade: string | undefined;
}) {
  const t = useI18n();
  if (quantity <= 1 && !grade) return null;
  return (
    <span className="flex shrink-0 flex-col items-end text-right md:hidden">
      {quantity > 1 && (
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          <span className="sr-only">{t("items.quantity")} </span>×{quantity}
        </span>
      )}
      {grade && (
        <span className="max-w-28 truncate text-xs text-muted-foreground">
          <span className="sr-only">{t("items.grade")} </span>
          {grade}
        </span>
      )}
    </span>
  );
}

function Amount({ label, children }: { label: string; children?: string }) {
  return (
    <span className="hidden w-28 truncate text-right text-ui tabular-nums lg:block">
      {children && (
        <>
          <span className="sr-only">{label} </span>
          {children}
        </>
      )}
    </span>
  );
}

function ItemGrid({
  result,
  selection,
}: {
  result: BrowseResult;
  selection: Selecting;
}) {
  const t = useI18n();
  const describe = useItemFacts(result.currency);
  return (
    <ul className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {result.items.map((item) => {
        const about = describe(item);
        const TypeIcon = itemTypeIcons[item.type];
        return (
          <li key={item._id} className="min-w-0">
            <ItemTarget
              item={item}
              items={result.items}
              selection={selection}
              className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card outline-none transition-colors duration-100 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {selection && (
                <span className="absolute left-2 top-2">
                  <SelectBox checked={selection.isSelected(item._id)} />
                </span>
              )}
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
                <span className="truncate text-ui font-medium">
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
            </ItemTarget>
          </li>
        );
      })}
    </ul>
  );
}

/** "26–50 of 134", "Page 2 of 6" and the first, previous, next and last page. */
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
            label={t("collection.firstPage")}
            disabled={result.page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft strokeWidth={1.75} aria-hidden="true" />
          </PageButton>
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
          <PageButton
            label={t("collection.lastPage")}
            disabled={result.page >= result.pageCount}
            onClick={() => onPageChange(result.pageCount)}
          >
            <ChevronsRight strokeWidth={1.75} aria-hidden="true" />
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
