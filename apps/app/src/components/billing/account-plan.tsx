"use client";

import { upgradeHref } from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Plan } from "@coinslite/backend/convex/plans/rules";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { ChevronRight, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCustomerPortal } from "./customer-portal";

const rowClass =
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const iconClass = "size-4 shrink-0 text-muted-foreground";

/** The subscription behind Premium; undefined while loading or on the Free plan. */
const useSubscription = () => useQuery(api.billing.status, {})?.subscription;

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
  return (
    <p className="text-[13px] text-muted-foreground">{parts.join(" · ")}</p>
  );
}

/**
 * Account's way into the plan: a Premium member opens Polar's portal to
 * change or cancel their subscription; on the Free plan, Plans offers Premium.
 */
export function PlanLink({ plan }: { plan: Plan }) {
  return (
    <div className="rounded-lg border bg-card p-1">
      {plan === "premium" ? <ManageSubscription /> : <Upgrade />}
    </div>
  );
}

function ManageSubscription() {
  const t = useI18n();
  const portal = useCustomerPortal();
  const unavailable =
    useQuery(api.billing.status, {})?.portalAvailable === false;
  return (
    <>
      <button
        type="button"
        className={cn(
          rowClass,
          "disabled:cursor-default disabled:hover:bg-transparent",
        )}
        onClick={() => void portal.open()}
        disabled={unavailable || portal.opening}
      >
        <CreditCard
          className={iconClass}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("billing.manage")}
        {unavailable ? (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {t("billing.portalUnavailableShort")}
          </span>
        ) : portal.opening ? (
          <Loader2
            className="ml-auto size-3.5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ExternalLink
            className="ml-auto size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>
      {portal.error && (
        <p role="alert" className="px-2 py-1.5 text-xs text-destructive">
          {portal.error}
        </p>
      )}
    </>
  );
}

function Upgrade() {
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
