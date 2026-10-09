"use client";

import { useI18n } from "@/locales/client";
import { HeaderBar } from "@coinslite/ui/header-bar";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

/** Account is a reading page: a narrow column under the header bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  // Updates sits below Account, so its header leads back there.
  const updates = useSelectedLayoutSegment() === "updates";
  return (
    <>
      <HeaderBar
        title={updates ? t("updates.title") : t("nav.account")}
        parent={
          updates && (
            <Link href="/settings" className="hover:text-foreground">
              {t("nav.account")}
            </Link>
          )
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {children}
      </div>
    </>
  );
}
