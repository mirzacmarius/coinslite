"use client";

import { useI18n } from "@/locales/client";
import { Logo } from "@coinslite/ui/logo";
import { SearchX } from "lucide-react";
import Link from "next/link";

/** An address nothing answers, or a page that isn't there: one calm column, like sign-in. */
export default function NotFound() {
  const t = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex h-12 items-center px-4 pt-[env(safe-area-inset-top)]">
        <Logo className="text-[13px]" />
      </div>
      <main
        id="main"
        className="flex flex-1 justify-center px-4 pb-16 pt-[10dvh]"
      >
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <SearchX className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[15px] font-medium">{t("notFound.title")}</h1>
            <p className="text-[13px] text-muted-foreground">
              {t("notFound.description")}
            </p>
          </div>
          <Link
            href="/"
            className="text-[13px] font-medium text-link hover:underline"
          >
            {t("notFound.home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
