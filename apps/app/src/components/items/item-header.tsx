"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import type { MoneyFormatOptions } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { cn } from "@coinslite/ui/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

/**
 * How the Item page shows an amount in the Item's Home currency, undefined
 * for none. Every amount on the page goes through the one the page makes.
 */
export type ItemMoney = (
  amount: number | undefined,
  options?: MoneyFormatOptions,
) => string | undefined;

/**
 * The Item type, the title and the key facts (year · denomination ·
 * country). The bar above already holds the page's heading, so the title
 * here isn't a second one.
 */
export function ItemTitle({
  item,
  className,
}: {
  item: Doc<"items">;
  className?: string;
}) {
  const t = useI18n();
  const format = useFormatters();
  const keyFacts = [
    item.year,
    item.denomination,
    item.country && format.country(item.country),
  ]
    .filter((fact) => fact !== undefined && fact !== "")
    .join(" · ");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="flex items-center gap-2 text-ui text-muted-foreground">
        <ItemTypeIcon type={item.type} className="size-6 rounded" />
        {t(`items.types.${item.type}`)}
        {item.soldOn !== undefined && (
          <Badge variant="outline">{t("sale.soldBadge")}</Badge>
        )}
      </p>
      <p className="text-balance break-words text-2xl font-semibold leading-tight tracking-tight">
        {item.title}
      </p>
      {keyFacts && (
        <p className="text-base text-muted-foreground">{keyFacts}</p>
      )}
    </div>
  );
}

/**
 * One of the facts the Item page sums the Item up with under its title, such
 * as its Grade or Album: an `icon` and text, opening `href` when given (in a
 * new tab, marked, when `external`).
 */
export function ItemTag({
  icon,
  href,
  external = false,
  children,
}: {
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const layout =
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-ui [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";
  const content = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );
  if (!href) return <li className={layout}>{content}</li>;
  const link = cn(
    layout,
    "outline-none transition-colors duration-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
  );
  return (
    <li className="flex max-w-full">
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={link}>
          {content}
          <ArrowUpRight strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : (
        <Link href={href} className={link}>
          {content}
        </Link>
      )}
    </li>
  );
}

/** ItemTitle while the Item loads. */
export function ItemTitleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-hidden="true">
      <span className="h-6 w-24 animate-pulse rounded bg-muted" />
      <span className="h-7 w-72 max-w-[85%] animate-pulse rounded bg-muted" />
      <span className="h-5 w-48 animate-pulse rounded bg-muted" />
    </div>
  );
}
