"use client";

import { LanguageMenu } from "@/components/preferences";
import { WebsiteLink } from "@/components/website-link";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Logo } from "@coinslite/ui/logo";

/**
 * The frame around a shared page (spec §8): no app shell, since whoever
 * opens the link may have no account. The wordmark and a language menu
 * above, the page in one column, and a word about keeping one's own
 * Collection below.
 */
export function SharedFrame({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex h-12 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <WebsiteLink className="rounded-md text-ui font-medium">
          <Logo />
        </WebsiteLink>
        <LanguageMenu />
      </div>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{t("shared.ctaTitle")}</p>
            <p className="text-ui text-muted-foreground">
              {t("shared.ctaDescription")}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <WebsiteLink>{t("shared.ctaAction")}</WebsiteLink>
          </Button>
        </div>
      </footer>
    </div>
  );
}
