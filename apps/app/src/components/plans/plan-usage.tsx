"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { freePlan, planErrors } from "@coinslite/backend/convex/plans/rules";
import { Button } from "@coinslite/ui/button";
import { Progress } from "@coinslite/ui/progress";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import type * as React from "react";

/** Where to upgrade: the Plans page, with Premium's prices and checkout. */
export const upgradeHref = "/settings/billing";

/** True when adding or duplicating was turned away by the Free plan's limit. */
export const isItemLimitError = (failure: unknown) =>
  failure instanceof ConvexError &&
  failure.data === planErrors.itemLimitReached;

/** "The Free plan holds 50 Items…", for a refused add or duplicate. */
export function useItemLimitMessage() {
  const t = useI18n();
  return t("plans.limitError", { limit: freePlan.itemLimit });
}

/** The Free plan's usage; undefined while loading, on Premium, or signed out. */
function useFreePlanUsage() {
  const usage = useQuery(api.plans.usage);
  // The sidebar subscribes too, so the Overview could otherwise hydrate with data its server HTML lacked.
  const hydrated = useHydrated();
  return hydrated && usage?.plan === "free" ? usage : undefined;
}

type Usage = NonNullable<ReturnType<typeof useFreePlanUsage>>;

function UsageCount({ usage }: { usage: Usage }) {
  const t = useI18n();
  const { used, limit } = usage;
  return used > limit
    ? t("plans.overLimit", { limit })
    : t("plans.itemsUsed", { used, limit });
}

function UsageBar({ usage }: { usage: Usage }) {
  const t = useI18n();
  return (
    <Progress
      value={Math.min(usage.used, usage.limit)}
      max={usage.limit}
      label={t("plans.usageLabel")}
    />
  );
}

function UpgradeLink({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={upgradeHref}
      className={cn("font-medium text-primary hover:underline", className)}
    >
      {children}
    </Link>
  );
}

/** The sidebar's footer: Items used on the Free plan, and from 40 a way up. */
export function SidebarPlanUsage() {
  const t = useI18n();
  const usage = useFreePlanUsage();
  if (!usage) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("plans.freePlan")}</span>
        <span className="font-medium">
          <UsageCount usage={usage} />
        </span>
      </div>
      <UsageBar usage={usage} />
      {usage.warning && (
        <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
          <span className="text-foreground">
            {t(usage.canAdd ? "plans.nearLimit" : "plans.full")}
          </span>
          <UpgradeLink>{t("plans.upgrade")}</UpgradeLink>
        </div>
      )}
    </div>
  );
}

/** The Overview's plan card: usage out of 50, louder from 40, with the upgrade path. */
export function OverviewPlanUsage() {
  const t = useI18n();
  const usage = useFreePlanUsage();
  if (!usage) return null;
  const { used, limit, warning, canAdd } = usage;
  const notice = !canAdd
    ? `${t("plans.fullNotice", { limit })} ${t("plans.keepItems")}`
    : warning
      ? t("plans.nearLimitNotice", { used, limit })
      : t("plans.premiumPitch");
  return (
    <section
      aria-label={t("plans.freePlan")}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">{t("plans.freePlan")}</h2>
          <p className="text-[13px] text-muted-foreground">
            {used > limit
              ? t("plans.overLimit", { limit })
              : t("plans.usedOf", { used, limit })}
          </p>
        </div>
        {warning ? (
          <Button asChild size="xs">
            <Link href={upgradeHref}>{t("plans.upgradeToPremium")}</Link>
          </Button>
        ) : (
          <UpgradeLink className="text-[13px]">
            {t("plans.upgradeToPremium")}
          </UpgradeLink>
        )}
      </div>
      <UsageBar usage={usage} />
      <p
        className={cn(
          "text-xs",
          warning ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {notice}
      </p>
    </section>
  );
}

/**
 * A banner row in the New Item dialog from 40 Items: how many are used, or
 * that the plan is full, with the upgrade link. Saving stays possible; the
 * server has the last word.
 */
export function ItemLimitNotice() {
  const t = useI18n();
  const usage = useFreePlanUsage();
  if (!usage?.warning) return null;
  const { used, limit, canAdd } = usage;
  return (
    <p className="rounded-md border bg-muted px-3 py-2 text-xs">
      {canAdd
        ? t("plans.nearLimitNotice", { used, limit })
        : t("plans.fullNotice", { limit })}{" "}
      <UpgradeLink>{t("plans.upgradeToPremium")}</UpgradeLink>
    </p>
  );
}
