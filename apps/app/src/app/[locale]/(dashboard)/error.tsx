"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * A page that failed, shown inside the app's frame: the sidebar stays, Try
 * again loads the page afresh, and the Overview is a click away. The error
 * goes to Sentry, which lib/sentry.ts keeps free of personal data.
 */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useI18n();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <>
      <HeaderBar title={t("error.title")} />
      <div className="p-4">
        <EmptyState
          icon={
            <TriangleAlert
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={t("error.title")}
          description={t("error.description")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={() => retry()}>
                {t("error.retry")}
              </Button>
              <Link
                href="/"
                className="text-[13px] font-medium text-link hover:underline"
              >
                {t("error.home")}
              </Link>
            </div>
          }
        />
      </div>
    </>
  );
}
