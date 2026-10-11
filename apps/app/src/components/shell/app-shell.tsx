"use client";

import { UnseenMarker } from "@/components/updates/unseen-marker";
import { useUpdatesStatus } from "@/components/updates/use-updates-status";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { SidebarInset, SidebarProvider } from "@coinslite/ui/sidebar";
import { SkipLink } from "@coinslite/ui/skip-link";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { type NavItem, isCurrent, navItems } from "./navigation";
import { WorkspaceMenu } from "./workspace-menu";

/** The tabs along the bottom of phones. */
function PhoneTabs({ items }: { items: NavItem[] }) {
  const t = useI18n();
  const pathname = usePathname();
  const unseen = useUpdatesStatus()?.unseen === true;
  return (
    <ul
      className="grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ key, href, icon: Icon }) => {
        const current = isCurrent(pathname, href);
        // On phones the Account tab is where Updates are reached from.
        const marked = key === "account" && unseen;
        const icon = (
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        );
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                // The current tab gets a bar and bold text, not just a colour.
                "relative flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground",
                current &&
                  "font-semibold text-foreground before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-full before:bg-foreground",
              )}
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

/** Where the sidebar keeps whether it's open (shadcn/ui's sidebar writes it on every toggle). */
const sidebarCookie = "sidebar_state";

/**
 * Whether the sidebar is open: open at first, as every page is prerendered
 * (ADR 0004: no cookies read for the shell), then as the person last left
 * it, read from its cookie in the browser. A full page load of someone who
 * keeps it collapsed therefore closes it just after the first paint.
 */
function useSidebarOpen() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (document.cookie.split("; ").includes(`${sidebarCookie}=false`))
      setOpen(false);
  }, []);
  return [open, setOpen] as const;
}

/**
 * The frame around every signed-in screen: on tablets and desktops a sidebar
 * that collapses to icons (app-sidebar.tsx) beside the page's panel, and on
 * phones a compact top bar plus four tabs (three while the Catalog is
 * hidden). Each page starts with its own HeaderBar, which holds the title
 * and actions such as Add.
 */
export function AppShell({
  children,
  quickActions,
  sidebarFooter,
}: {
  children: React.ReactNode;
  /** Above the navigation: the things people do most, such as adding an Item, as sidebar menu items. */
  quickActions?: React.ReactNode;
  /** The bottom of the sidebar, above the person: Spot prices and plan usage, stacked. */
  sidebarFooter?: React.ReactNode;
}) {
  const t = useI18n();
  const items = useNavItems();
  const [open, setOpen] = useSidebarOpen();

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      className="bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:h-svh md:overflow-hidden"
    >
      <SkipLink label={t("shell.skipToContent")} />

      {/* Account is under Settings in the sidebar; phones have it as a tab. */}
      <AppSidebar
        items={items.filter(({ key }) => key !== "account")}
        quickActions={quickActions}
        footer={sidebarFooter}
      />

      {/* From tablet width up, pages sit on a panel inset from the chrome
        and scroll inside it, so the sidebar and panel edges stay put. */}
      <SidebarInset className="min-w-0 md:overflow-hidden">
        <div className="flex h-11 items-center border-b bg-card px-2 pt-[env(safe-area-inset-top)] md:hidden">
          <WorkspaceMenu className="h-8" />
        </div>
        <main
          id="main"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col pb-28 outline-none md:overflow-y-auto md:pb-0"
        >
          {children}
        </main>
      </SidebarInset>

      <nav
        aria-label={t("shell.primaryNavigation")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <PhoneTabs items={items.filter(({ onPhoneTabs }) => onPhoneTabs)} />
      </nav>
    </SidebarProvider>
  );
}
