"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { ChevronRight, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCustomerPortal } from "./customer-portal";

const rowClass =
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-ui font-medium transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const iconClass = "size-4 shrink-0 text-muted-foreground";

/** The subscription behind Premium; undefined while loading or on the Free plan. */
export const useSubscription = () =>
  useQuery(api.billing.status, {})?.subscription;

/** Account's header line for a Premium member: "Yearly · Renews on 9 Oct 2027". */
export function SubscriptionSummary() {
  const t = useI18n();
  const { date } = useFormatters();
  const subscription = useSubscription();
  if (!subscription) return null;
  const { interval, currentPeriodEnd, cancelAtPeriodEnd } = subscription;
  const parts = [
    interval && t(interval === "month" ? "billing.monthly" : "billing.yearly"),
    currentPeriodEnd !== null &&
      t(cancelAtPeriodEnd ? "billing.endsOn" : "billing.renewsOn", {
        date: date(currentPeriodEnd),
      }),
  ].filter((part): part is string => typeof part === "string");
  if (parts.length === 0) return null;
  return <p className="text-ui text-muted-foreground">{parts.join(" · ")}</p>;
}

/**
 * A Premium member's Manage subscription on Account, folded to its row
 * until opened: then what Polar's portal is for and the way there, to
 * change or cancel the plan, followed by `children` (Delete account).
 */
export function ManageSubscription({
  children,
}: {
  /** Buttons after the way to Polar, in the same wrapping row. */
  children?: ReactNode;
}) {
  const t = useI18n();
  const portal = useCustomerPortal();
  const unavailable =
    useQuery(api.billing.status, {})?.portalAvailable === false;
  return (
    <Collapsible>
      <CollapsibleTrigger className={cn(rowClass, "group")}>
        <CreditCard
          className={iconClass}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("billing.manage")}
        <ChevronRight
          className="ml-auto size-3.5 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pb-3 pl-8 pr-2 pt-1">
        <p className="text-xs text-muted-foreground">
          {unavailable
            ? t("billing.portalUnavailable")
            : t("billing.manageHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void portal.open()}
            disabled={unavailable || portal.opening}
          >
            {portal.opening ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLink strokeWidth={1.75} aria-hidden="true" />
            )}
            {t("billing.changeOrCancel")}
          </Button>
          {children}
          {portal.error && (
            <p role="alert" className="basis-full text-xs text-destructive">
              {portal.error}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Account's way to Premium on the Free plan: Plans, which offers it. */
export function AccountUpgradeLink() {
  const t = useI18n();
  return (
    <Link href={upgradeHref} className={rowClass}>
      <CreditCard className={iconClass} strokeWidth={1.75} aria-hidden="true" />
      {t("plans.upgradeToPremium")}
      <ChevronRight
        className="ml-auto size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
