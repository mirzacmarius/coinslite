"use client";

import {
  AppearanceRadioItems,
  LanguageRadioItems,
} from "@/components/preferences";
import { useSignOut } from "@/components/sign-out";
import { UnseenMarker } from "@/components/updates/unseen-marker";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@coinslite/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { Logo } from "@coinslite/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@coinslite/ui/sidebar";
import { useQuery } from "convex/react";
import {
  ChevronRight,
  ChevronsUpDown,
  Languages,
  LogOut,
  Settings,
  SunMoon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { type NavItem, isCurrent } from "./navigation";
import { useSettingsLinks } from "./settings-links";

/**
 * The sidebar on tablets and desktops (shadcn/ui's sidebar-07): the logo and
 * the most used actions at the top, then the sections and Settings, and at
 * the bottom Spot prices, plan usage and the person, whose menu holds the
 * language, appearance and signing out. It collapses to icons (Cmd/Ctrl+B,
 * the button beside the logo, or the rail along its edge).
 */
export function AppSidebar({
  items,
  quickActions,
  footer,
}: {
  items: NavItem[];
  quickActions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useI18n();
  const pathname = usePathname();
  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      label={t("shell.primaryNavigation")}
      // Clear of a notch or the rounded corners of a phone held sideways.
      className="pl-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 pl-2 group-data-[collapsible=icon]:pl-0">
          <Link
            href="/"
            className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
          >
            <Logo className="text-[13px] font-medium" />
          </Link>
          <SidebarTrigger
            label={t("shell.toggleSidebar")}
            className="text-muted-foreground hover:bg-sidebar-accent"
          />
        </div>
        {quickActions && <SidebarMenu>{quickActions}</SidebarMenu>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <nav aria-label={t("shell.primaryNavigation")}>
            <SidebarMenu className="gap-0.5">
              {items.map(({ key, href, icon: Icon }) => {
                const current = isCurrent(pathname, href);
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      asChild
                      isActive={current}
                      tooltip={t(`nav.${key}`)}
                    >
                      <Link
                        href={href}
                        aria-current={current ? "page" : undefined}
                      >
                        <Icon strokeWidth={1.75} aria-hidden="true" />
                        <span>{t(`nav.${key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SettingsItem />
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {footer && (
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            {footer}
          </div>
        )}
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail label={t("shell.toggleSidebar")} />
    </Sidebar>
  );
}

/**
 * Settings, opening onto the account, plans, updates and the admin areas.
 * It opens on arriving at one of them, and shows as current while closed
 * over the current one; collapsed to an icon, it opens the sidebar to show
 * them.
 */
function SettingsItem() {
  const t = useI18n();
  const pathname = usePathname();
  const links = useSettingsLinks();
  const { state, setOpen: setSidebarOpen } = useSidebar();
  // The current link is the one whose page is the longest match: Plans
  // (/settings/billing), not Account (/settings), while on Plans.
  const current = links
    .filter(({ href }) => isCurrent(pathname, href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const [open, setOpen] = useState(current !== undefined);
  // The shell stays mounted between pages, so arriving at one opens it.
  const currentHref = current?.href;
  useEffect(() => {
    if (currentHref) setOpen(true);
  }, [currentHref]);
  // The marker shows on Settings whenever its links are out of sight.
  const unseen =
    links.some((link) => link.unseen) && (!open || state === "collapsed");
  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={t("shell.settings")}
            isActive={current !== undefined && (!open || state === "collapsed")}
            onClick={(event) => {
              if (state !== "collapsed") return;
              event.preventDefault();
              setSidebarOpen(true);
              setOpen(true);
            }}
          >
            <Settings strokeWidth={1.75} aria-hidden="true" />
            <span>{t("shell.settings")}</span>
            {unseen && (
              <>
                <UnseenMarker className="ml-auto group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:size-1.5" />
                <span className="sr-only">{t("updates.unseen")}</span>
              </>
            )}
            <ChevronRight
              className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {links.map(({ href, label, unseen: linkUnseen }) => (
              <SidebarMenuSubItem key={href}>
                <SidebarMenuSubButton asChild isActive={current?.href === href}>
                  <Link
                    href={href}
                    aria-current={current?.href === href ? "page" : undefined}
                  >
                    <span>{label}</span>
                    {linkUnseen && (
                      <>
                        <UnseenMarker className="ml-auto" />
                        <span className="sr-only">{t("updates.unseen")}</span>
                      </>
                    )}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** The first letters of a name's first two words, for an avatar without a picture. */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

/** The signed-in person at the bottom of the sidebar, opening their preferences. */
function SidebarUser() {
  const t = useI18n();
  const signOut = useSignOut();
  const { isMobile } = useSidebar();
  const user = useQuery(api.users.getUser);
  const name = user?.name || user?.email || "";
  const avatar = (
    <Avatar className="size-7 rounded-md">
      {user?.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback className="rounded-md bg-sidebar-accent text-[11px] font-medium">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
  const who = (
    <span className="grid min-w-0 flex-1 text-left leading-tight">
      <span className="truncate text-[13px] font-medium text-foreground">
        {name}
      </span>
      {user?.email && user.email !== name && (
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      )}
    </span>
  );
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={name || undefined}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {avatar}
              {who}
              <ChevronsUpDown className="ml-auto" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              {avatar}
              {who}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages strokeWidth={1.75} />
                {t("common.language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <LanguageRadioItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SunMoon strokeWidth={1.75} />
                {t("shell.appearance")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <AppearanceRadioItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut strokeWidth={1.75} />
              {t("shell.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
