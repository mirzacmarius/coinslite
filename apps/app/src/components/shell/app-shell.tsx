"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useI18n } from "@/locales/client";
import { SkipLink } from "@coinslite/ui/skip-link";
import { cn } from "@coinslite/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { isCurrent, navItems } from "./navigation";

/**
 * The frame around every signed-in screen: a sidebar on desktop, and on phones
 * a compact top bar plus four tabs. Pages render their own PageHeader, which
 * holds actions such as Add.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  /** Extra content at the bottom of the sidebar, e.g. plan usage or sign-out. */
  sidebarFooter?: React.ReactNode;
}) {
  const t = useI18n();
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[232px_1fr]">
      <SkipLink label={t("shell.skipToContent")} />

      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r bg-sidebar p-3 md:flex">
        <div className="flex flex-col gap-5">
          <Link href="/" className="rounded-md px-2 py-1">
            <Logo />
          </Link>
          <nav aria-label={t("shell.primaryNavigation")}>
            <ul className="flex flex-col gap-0.5">
              {navItems.map(({ key, href, icon: Icon }) => {
                const current = isCurrent(pathname, href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        current &&
                          "bg-accent text-accent-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-3">
          {sidebarFooter}
          <div className="flex flex-wrap items-center gap-2 px-1">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-2.5 md:hidden">
          <Link href="/" className="rounded-md">
            <Logo className="text-sm" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-28 pt-5 outline-none md:px-8 md:pb-10 md:pt-7"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label={t("shell.primaryNavigation")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {navItems
            .filter(({ onPhoneTabs }) => onPhoneTabs)
            .map(({ key, href, icon: Icon }) => {
              const current = isCurrent(pathname, href);
              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground",
                      current && "text-primary",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
