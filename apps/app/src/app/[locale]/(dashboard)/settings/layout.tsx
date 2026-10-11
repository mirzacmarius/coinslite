"use client";

import { useI18n } from "@/locales/client";
import { HeaderBar } from "@coinslite/ui/header-bar";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

/** Account is a reading page: a narrow column under the header bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  // Updates, Plans and the Insurance report sit below Account, so their headers lead back there.
  const segment = useSelectedLayoutSegment();
  const below =
    segment === "updates"
      ? t("updates.title")
      : segment === "billing"
        ? t("shell.plans")
        : segment === "insurance-report"
          ? t("insuranceReport.title")
          : undefined;
  return (
    <>
      <HeaderBar
        title={below ?? t("nav.account")}
        parent={
          below && (
            <Link href="/settings" className="hover:text-foreground">
              {t("nav.account")}
            </Link>
          )
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 md:py-10">
        {children}
      </div>
    </>
  );
}
