"use client";

import { useI18n } from "@/locales/client";
import { HeaderBar } from "@coinslite/ui/header-bar";

/** Account is a reading page: a narrow column under the header bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  return (
    <>
      <HeaderBar title={t("nav.account")} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {children}
      </div>
    </>
  );
}
