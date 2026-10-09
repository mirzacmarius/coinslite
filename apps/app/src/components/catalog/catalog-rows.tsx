"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { catalogNodeHref } from "./catalog-levels";
import { type CatalogEntryRow, useCatalogFormat } from "./use-catalog-format";

/**
 * One clickable row of a Catalog list: a tile, a title over its facts (and
 * its image's credit, when it needs one), and a figure on the right.
 */
export function CatalogRow({
  href,
  tile,
  title,
  suffix,
  facts,
  credit,
  end,
}: {
  href: string;
  tile: React.ReactNode;
  title: string;
  /** Muted words after the title, such as a Strike. */
  suffix?: string;
  facts?: string;
  /** Who the tile's image is credited to. */
  credit?: string;
  end?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center gap-3 px-4 py-1.5 outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted"
      >
        {tile}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">
            {title}
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
          {credit && (
            <span className="truncate text-xs text-muted-foreground">
              {credit}
            </span>
          )}
        </span>
        {end}
      </Link>
    </li>
  );
}

/** The icon tile of a row without a picture: a country, a Theme, a group. */
export function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

/** A count on the right of a row, with what it counts for screen readers. */
export function RowCount({ label, count }: { label: string; count: number }) {
  const format = useFormatters();
  return (
    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
      <span className="sr-only">{label} </span>
      {format.number(count)}
    </span>
  );
}

/** How many of an entry the person holds; nothing when none. */
export function HeldCount({ held }: { held: number }) {
  const t = useI18n();
  const format = useFormatters();
  if (held === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums">
      <Check
        className="size-3.5 text-primary"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="sr-only">
        {t("catalog.youHold", { count: format.number(held) })}
      </span>
      <span aria-hidden="true">{format.number(held)}</span>
    </span>
  );
}

/** An entry's thumbnail as a row tile, or its Item type's icon until it has an image. */
export function EntryTile({
  entry,
  className,
}: {
  entry: Pick<CatalogEntryRow, "thumbnailUrl" | "itemType">;
  className?: string;
}) {
  if (!entry.thumbnailUrl) {
    return (
      <ItemTypeIcon type={entry.itemType ?? "coin"} className={className} />
    );
  }
  return (
    <img
      src={entry.thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn(
        "size-8 shrink-0 rounded-md border bg-muted object-cover",
        className,
      )}
    />
  );
}

/** The person's own country, so rows only name other countries. */
export function useOwnCountry() {
  return useQuery(api.users.getUser)?.country;
}

/**
 * Catalog entries as rows: picture, title and Strike, facts, the picture's
 * credit when its licence asks for one, and how many the person holds.
 */
export function EntryRows({ entries }: { entries: CatalogEntryRow[] }) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const ownCountry = useOwnCountry();
  return entries.map((entry) => (
    <CatalogRow
      key={entry.key}
      href={catalogNodeHref(entry.key)}
      tile={<EntryTile entry={entry} />}
      title={entry.title}
      suffix={catalogFormat.strikeSuffix(entry)}
      facts={catalogFormat.rowFacts(entry, ownCountry).join(" · ")}
      credit={
        entry.imageCredit &&
        `${t("catalog.imageCredit")} · ${catalogFormat.credit(entry.imageCredit)}`
      }
      end={<HeldCount held={entry.held} />}
    />
  ));
}

/** A heading between the groups and the entries of one list. */
export function ListHeading({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex h-8 items-center bg-background px-4 text-xs font-medium text-muted-foreground">
      {children}
    </li>
  );
}

/** Rows standing in for a list that is loading. */
export function RowsSkeleton() {
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

/** A quiet line for a level with nothing in it. */
export function EmptyLevel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
