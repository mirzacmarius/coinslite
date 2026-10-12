"use client";

import { ItemThumbnail } from "@/components/items/item-thumbnail";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useId } from "react";

type LatestItem = FunctionReturnType<typeof api.overview.latestItems>[number];

/**
 * A row's figures on the right, as the Collection's rows show them on a
 * phone: the Market value of one piece, × Quantity when there's more than
 * one. The value never truncates; the title gives way instead.
 */
function ItemFigures({ item }: { item: LatestItem }) {
  const t = useI18n();
  const format = useFormatters();
  const { marketValue, quantity } = item;
  if (marketValue === undefined && quantity === 1) return null;
  return (
    <span className="shrink-0 whitespace-nowrap text-right text-[13px] tabular-nums">
      {marketValue !== undefined && (
        <>
          <span className="sr-only">{t("items.marketValue")} </span>
          {format.money(marketValue, item.currency)}
        </>
      )}
      {quantity > 1 && (
        <span className="text-xs text-muted-foreground">
          {marketValue !== undefined && " "}
          <span className="sr-only">{t("items.quantity")} </span>×{quantity}
        </span>
      )}
    </span>
  );
}

/**
 * The most recently added Items, newest first, each with its Market value
 * and opening its Item detail.
 */
export function LatestItems({ items }: { items: LatestItem[] | undefined }) {
  const t = useI18n();
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={items === undefined}
      className="overflow-hidden rounded-xl bg-card"
    >
      <div className="flex h-10 items-center justify-between gap-3 border-b pl-4 pr-2">
        <h2 id={titleId} className="text-[13px] font-medium">
          {t("overview.latestItems")}
        </h2>
        <Button asChild variant="ghost" size="xs">
          <Link href="/collection">{t("overview.viewCollection")}</Link>
        </Button>
      </div>
      {items === undefined ? (
        <div className="flex flex-col divide-y" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex min-h-14 items-center gap-3 px-4">
              <span className="size-10 shrink-0 animate-pulse rounded-md bg-muted" />
              <span className="flex flex-col gap-1.5">
                <span className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                <span className="h-3 w-24 animate-pulse rounded bg-muted" />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((item) => {
            const facts = [
              item.year === undefined ? undefined : String(item.year),
              item.denomination,
            ].filter(Boolean);
            return (
              <li key={item._id}>
                <Link
                  href={`/collection/${item._id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 outline-none transition-colors duration-100 hover:bg-muted/60 focus-visible:bg-muted"
                >
                  <ItemThumbnail
                    type={item.type}
                    url={item.thumbnailUrl}
                    className="size-10"
                  />
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
                  <ItemFigures item={item} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
