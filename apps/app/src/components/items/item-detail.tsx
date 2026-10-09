"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { useQuery } from "convex/react";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type * as React from "react";

/** One Item, every recorded fact: descriptive facts beside, the rest in the properties panel. */
export function ItemDetail() {
  const t = useI18n();
  const { itemId } = useParams<{ itemId: string }>();
  const item = useQuery(api.items.get, { itemId });
  const format = useFormatters();
  const parent = (
    <Link href="/collection" className="hover:text-foreground">
      {t("nav.collection")}
    </Link>
  );

  if (item === undefined) {
    return <HeaderBar parent={parent} title="" />;
  }
  if (item === null) {
    return (
      <>
        <HeaderBar parent={parent} title={t("items.notFoundTitle")} />
        <div className="p-4">
          <EmptyState
            icon={
              <SearchX
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("items.notFoundTitle")}
            description={t("items.notFound")}
            action={
              <Link
                href="/collection"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("items.backToCollection")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const money = (amount: number | undefined) =>
    amount === undefined ? undefined : format.money(amount, item.currency);
  const facts = [
    [t("items.country"), item.country && format.country(item.country)],
    [t("items.year"), item.year],
    [t("items.denomination"), item.denomination],
  ] as const;

  return (
    <>
      <HeaderBar parent={parent} title={item.title} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4">
          <div className="flex items-center gap-3">
            <ItemTypeIcon type={item.type} />
            <h2 className="text-base font-medium">{item.title}</h2>
          </div>
          {facts.some(([, value]) => value !== undefined) && (
            <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {facts.map(
                ([label, value]) =>
                  value !== undefined && (
                    <div key={label} className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ),
              )}
            </dl>
          )}
          {item.notes && (
            <section className="flex max-w-xl flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("items.notes")}
              </h3>
              <p className="whitespace-pre-line text-sm">{item.notes}</p>
            </section>
          )}
        </div>
        <aside className="flex w-full shrink-0 flex-col divide-y border-t bg-card lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[300px]">
          <PanelSection title={t("items.details")}>
            <PropertyRow label={t("items.type")}>
              {t(`items.types.${item.type}`)}
            </PropertyRow>
            <PropertyRow label={t("items.quantity")}>
              {format.number(item.quantity)}
            </PropertyRow>
          </PanelSection>
          <PanelSection title={t("items.purchase")}>
            <PropertyRow label={t("items.purchasePrice")}>
              {money(item.purchasePrice)}
            </PropertyRow>
            <PropertyRow label={t("items.marketValue")}>
              {money(item.marketValue)}
            </PropertyRow>
            <PropertyRow label={t("items.purchaseDate")}>
              {item.purchaseDate && format.date(item.purchaseDate)}
            </PropertyRow>
            <PropertyRow label={t("items.source")}>{item.source}</PropertyRow>
          </PanelSection>
        </aside>
      </div>
    </>
  );
}

function PanelSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 p-4">
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A label and its value; a missing value shows as a dash. */
function PropertyRow({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-7 grid-cols-[112px_1fr] items-center gap-2">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-[13px]">{children ?? "–"}</span>
    </div>
  );
}
