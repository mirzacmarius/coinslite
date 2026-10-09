"use client";

import { useScopedI18n } from "@/locales/client";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { LayoutDashboard } from "lucide-react";

/** Rendered in the browser from the loaded dictionary, so it appears the moment a link is clicked. */
export function Overview() {
  const t = useScopedI18n("dashboard");
  return (
    <>
      <HeaderBar title={t("headerTitle")} />
      <div className="p-4">
        <EmptyState
          icon={
            <LayoutDashboard
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={t("bodyTitle")}
          description={t("bodyDescription")}
        />
      </div>
    </>
  );
}
