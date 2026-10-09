"use client";

import { UnseenMarker } from "@/components/updates/unseen-marker";
import { useUpdatesStatus } from "@/components/updates/use-updates-status";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { SkipLink } from "@coinslite/ui/skip-link";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { type NavItem, isCurrent, navItems } from "./navigation";
import { WorkspaceMenu } from "./workspace-menu";

function NavLinks({
  items,
  layout,
}: {
  items: NavItem[];
  layout: "sidebar" | "tabs";
}) {
  const t = useI18n();
  const pathname = usePathname();
  const unseen = useUpdatesStatus()?.unseen === true;
  return (
    <ul
      className={layout === "sidebar" ? "flex flex-col gap-0.5" : "grid"}
      style={
        layout === "tabs"
          ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {items.map(({ key, href, icon: Icon }) => {
        const current = isCurrent(pathname, href);
        // On phones the Account tab is where Updates are reached from.
        const marked = layout === "tabs" && key === "account" && unseen;
        const icon = (
          <Icon
            className={layout === "sidebar" ? "size-4" : "size-5"}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        );
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={
                layout === "sidebar"
                  ? cn(
                      "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground",
                      current && "bg-muted text-foreground",
                    )
                  : cn(
                      // The current tab gets a bar and bold text, not just a colour.
                      "relative flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground",
                      current &&
                        "font-semibold text-foreground before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-full before:bg-foreground",
                    )
              }
            >
              {marked ? (
                <span className="relative flex">
                  {icon}
                  <UnseenMarker className="absolute -right-0.5 -top-0.5 size-2 ring-2 ring-card" />
                </span>
              ) : (
                icon
              )}
              {t(`nav.${key}`)}
              {marked && <span className="sr-only">{t("updates.unseen")}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The navigation this person gets: everything, except the Catalog while an
 * admin has hidden it from them (feature flags). While that's loading the
 * Catalog shows, as it does by default.
 */
function useNavItems() {
  const catalogVisible = useQuery(api.featureFlags.isCatalogVisible);
  return catalogVisible === false
    ? navItems.filter(({ key }) => key !== "catalog")
    : navItems;
}

/**
 * The frame around every signed-in screen: a sidebar on tablets and desktops,
 * and on phones a compact top bar plus four tabs (three while the Catalog is
 * hidden). Each page starts with its own HeaderBar, which holds the title and
 * actions such as Add.
 */
export function AppShell({
  children,
  quickActions,
  sidebarFooter,
}: {
  children: React.ReactNode;
  /** Above the navigation: the things people do most, such as adding an Item. */
  quickActions?: React.ReactNode;
  /** The bottom of the sidebar: plan usage, nothing else. */
  sidebarFooter?: React.ReactNode;
}) {
  const t = useI18n();
  const items = useNavItems();

  return (
    <div className="min-h-dvh bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:grid md:grid-cols-[232px_1fr]">
      <SkipLink label={t("shell.skipToContent")} />

      <div className="sticky top-0 hidden h-dvh flex-col justify-between gap-2 border-r bg-sidebar p-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:flex">
        <div className="flex flex-col gap-3">
          <WorkspaceMenu className="h-8 w-full" markUnseen />
          {quickActions && (
            <div className="flex flex-col gap-1">{quickActions}</div>
          )}
          <nav aria-label={t("shell.primaryNavigation")}>
            <NavLinks items={items} layout="sidebar" />
          </nav>
        </div>
        {sidebarFooter}
      </div>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <div className="flex h-11 items-center border-b bg-card px-2 pt-[env(safe-area-inset-top)] md:hidden">
          <WorkspaceMenu className="h-8" />
        </div>
        <main
          id="main"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col pb-28 outline-none md:pb-0"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label={t("shell.primaryNavigation")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <NavLinks
          items={items.filter(({ onPhoneTabs }) => onPhoneTabs)}
          layout="tabs"
        />
      </nav>
    </div>
  );
}
