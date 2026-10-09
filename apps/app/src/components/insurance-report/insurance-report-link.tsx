"use client";

import { useI18n } from "@/locales/client";
import { cn } from "@coinslite/ui/utils";
import { ChevronRight, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

/** Account's link to the Insurance report, marked as Premium's on the Free plan. */
export function InsuranceReportLink({ premium }: { premium: boolean }) {
  const t = useI18n();
  return (
    <div className="rounded-lg border bg-card p-1">
      <Link
        href="/settings/insurance-report"
        className="flex h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium hover:bg-muted"
      >
        <ShieldCheck
          className="size-4 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {t("insuranceReport.title")}
        {!premium && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("billing.premium")}
          </span>
        )}
        <ChevronRight
          className={cn("size-3.5 text-muted-foreground", premium && "ml-auto")}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
