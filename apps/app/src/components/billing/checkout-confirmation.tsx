"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingPageSkeleton } from "./billing-page";

/** After this long without Polar's confirmation, the page says it's slow. */
const SLOW_AFTER_MS = 30_000;

/**
 * Where Polar sends buyers back after paying. Premium starts when Polar's
 * webhook confirms the subscription, which this page waits for live.
 */
export function CheckoutConfirmation() {
  const t = useI18n();
  const status = useQuery(api.billing.status, {});
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!status) return <BillingPageSkeleton />;
  const premium = status.plan === "premium";
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-12 text-center"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {premium ? (
          <Check className="size-4 text-success" strokeWidth={1.75} />
        ) : (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        )}
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-sm font-medium">
          {t(premium ? "billing.welcomeTitle" : "billing.confirmingTitle")}
        </h2>
        <p className="text-ui text-muted-foreground">
          {t(
            premium
              ? "billing.welcomeDescription"
              : slow
                ? "billing.slowDescription"
                : "billing.confirmingDescription",
          )}
        </p>
      </div>
      {premium ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/collection">{t("billing.toCollection")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/billing">{t("billing.seePlan")}</Link>
          </Button>
        </div>
      ) : (
        <Button asChild variant="outline">
          <Link href="/settings/billing">{t("billing.backToPlans")}</Link>
        </Button>
      )}
    </section>
  );
}
