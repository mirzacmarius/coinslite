"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type BillingInterval,
  billingErrors,
  billingIntervals,
  isPremiumCurrency,
} from "@coinslite/backend/convex/billing/rules";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { useId, useState } from "react";

type Status = NonNullable<FunctionReturnType<typeof api.billing.status>>;

export function BillingPageSkeleton() {
  return (
    <div
      className="h-40 animate-pulse rounded-lg bg-muted"
      aria-hidden="true"
    />
  );
}

/**
 * Plans: on the Free plan, Premium's prices (in the currency checkout will
 * charge, from the visitor's `country` when known) and the way to buy it; on
 * Premium, the plan and when it renews or ends.
 */
export function BillingPage({ country }: { country?: string }) {
  const status = useQuery(api.billing.status, { country });
  if (!status) return <BillingPageSkeleton />;
  return status.plan === "premium" ? (
    <PremiumPlan status={status} />
  ) : (
    <UpgradeToPremium status={status} />
  );
}

function Section({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="text-sm font-medium">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function UpgradeToPremium({ status }: { status: Status }) {
  const t = useI18n();
  const { money } = useFormatters();
  const checkout = useAction(api.billing.checkout);
  const name = useId();
  const [interval, chooseInterval] = useState<BillingInterval>("year");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();
  const { prices } = status;
  const saving = Math.round((1 - prices.year / (12 * prices.month)) * 100);

  const upgrade = async () => {
    setError(undefined);
    setOpening(true);
    try {
      const { url } = await checkout({ interval });
      // Off to Polar; the spinner stays until the page goes.
      window.location.assign(url);
    } catch (failure) {
      setOpening(false);
      const code = failure instanceof ConvexError ? String(failure.data) : "";
      setError(
        t(
          code === billingErrors.unavailable
            ? "billing.unavailable"
            : code === billingErrors.alreadyPremium
              ? "billing.alreadyPremium"
              : "billing.checkoutFailed",
        ),
      );
    }
  };

  return (
    <>
      <Section
        title={t("billing.currentPlan")}
        description={t("billing.freeDescription", {
          limit: freePlan.itemLimit,
        })}
        badge={<Badge>{t("plans.freePlan")}</Badge>}
      />
      <Section
        title={t("billing.premium")}
        description={t("billing.premiumDescription")}
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">{t("billing.billingPeriod")}</legend>
          {billingIntervals.map((option) => (
            <label
              key={option}
              className="group flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-100 hover:bg-muted has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={interval === option}
                onChange={() => chooseInterval(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card group-has-[:checked]:border-primary"
              >
                <span className="size-2 rounded-full bg-primary opacity-0 group-has-[:checked]:opacity-100" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  {t(option === "month" ? "billing.monthly" : "billing.yearly")}
                  {option === "year" && saving > 0 && (
                    <Badge>{t("billing.save", { percent: saving })}</Badge>
                  )}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {t(
                    option === "month" ? "billing.perMonth" : "billing.perYear",
                    {
                      price: money(prices[option], prices.currency),
                    },
                  )}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-muted-foreground">
          {t("billing.currencyHint", { currency: prices.currency })}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {status.checkoutAvailable
              ? status.testMode && t("billing.testMode")
              : t("billing.unavailable")}
          </p>
          <Button
            onClick={() => void upgrade()}
            disabled={!status.checkoutAvailable || opening}
          >
            {opening && <Loader2 className="animate-spin" />}
            {t("plans.upgradeToPremium")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </Section>
    </>
  );
}

function PremiumPlan({ status }: { status: Status }) {
  const t = useI18n();
  const { money, date } = useFormatters();
  const subscription = status.subscription;
  const periodEnd = subscription?.currentPeriodEnd ?? null;
  const ending = subscription?.cancelAtPeriodEnd ?? false;
  return (
    <Section
      title={t("billing.currentPlan")}
      description={t("billing.premiumDescription")}
      badge={<Badge variant="outline">{t("billing.premium")}</Badge>}
    >
      {subscription && (
        <dl className="flex flex-col divide-y rounded-md border text-[13px]">
          {subscription.interval && (
            <PlanRow label={t("billing.billingPeriod")}>
              {t(
                subscription.interval === "month"
                  ? "billing.monthly"
                  : "billing.yearly",
              )}
            </PlanRow>
          )}
          {subscription.interval &&
            isPremiumCurrency(subscription.currency) && (
              <PlanRow label={t("billing.price")}>
                {t(
                  subscription.interval === "month"
                    ? "billing.perMonth"
                    : "billing.perYear",
                  { price: money(subscription.amount, subscription.currency) },
                )}
              </PlanRow>
            )}
          {periodEnd !== null && (
            <PlanRow label={t(ending ? "billing.ends" : "billing.renews")}>
              {date(periodEnd)}
            </PlanRow>
          )}
        </dl>
      )}
      {ending && periodEnd !== null && (
        <p className="text-xs text-muted-foreground">
          {t("billing.endingNotice", { date: date(periodEnd) })}
        </p>
      )}
    </Section>
  );
}

function PlanRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
