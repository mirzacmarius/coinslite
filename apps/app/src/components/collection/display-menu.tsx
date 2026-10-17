"use client";

import { useI18n } from "@/locales/client";
import {
  type CollectionSort,
  type PageSize,
  collectionSorts,
  pageSizes,
} from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@coinslite/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { useId } from "react";
import {
  type CollectionDisplay,
  type CollectionLayout,
  collectionLayouts,
} from "./collection-display";

/**
 * Display options: list or grid and Items per page, kept on this device, and
 * the sort, kept in the URL with the filters.
 */
export function DisplayMenu({
  display,
  onDisplayChange,
  sort,
  onSortChange,
}: {
  display: CollectionDisplay;
  onDisplayChange: (change: Partial<CollectionDisplay>) => void;
  sort: CollectionSort;
  onSortChange: (sort: CollectionSort) => void;
}) {
  const t = useI18n();
  const sortLabel = useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="shrink-0">
          <SlidersHorizontal strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">{t("collection.display")}</span>
          <span className="sr-only sm:hidden">{t("collection.display")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[17.5rem] flex-col p-1">
        <Row label={t("collection.layout")}>
          <SegmentedControl<CollectionLayout>
            label={t("collection.layout")}
            options={collectionLayouts.map((layout) => ({
              value: layout,
              label: t(`collection.layouts.${layout}`),
            }))}
            value={display.layout}
            onChange={(layout) => onDisplayChange({ layout })}
            className="self-center"
          />
        </Row>
        <Row label={t("collection.sort")} labelId={sortLabel}>
          <Select
            value={sort}
            onValueChange={(value) => onSortChange(value as CollectionSort)}
          >
            <SelectTrigger
              aria-labelledby={sortLabel}
              className="h-7 w-[10rem] text-ui"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collectionSorts.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`collection.sorts.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label={t("collection.pageSize")}>
          <SegmentedControl
            label={t("collection.pageSize")}
            options={pageSizes.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            value={String(display.pageSize)}
            onChange={(size) =>
              onDisplayChange({ pageSize: Number(size) as PageSize })
            }
            className="self-center"
          />
        </Row>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 px-2 text-ui">
      <span id={labelId} className="text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
