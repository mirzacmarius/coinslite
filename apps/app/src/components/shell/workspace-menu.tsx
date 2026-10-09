"use client";

import { Logo } from "@/components/logo";
import {
  AppearanceRadioItems,
  LanguageRadioItems,
} from "@/components/preferences";
import { useSignOut } from "@/components/sign-out";
import { UnseenMarker } from "@/components/updates/unseen-marker";
import { updatesHref } from "@/components/updates/updates-href";
import { useUpdatesStatus } from "@/components/updates/use-updates-status";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import {
  ChartColumn,
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  Languages,
  LogOut,
  Sparkles,
  SunMoon,
  UserRound,
} from "lucide-react";
import Link from "next/link";

/** The row at the top of the sidebar (and phone top bar) holding account and preferences. */
export function WorkspaceMenu({
  className,
  markUnseen = false,
}: {
  className?: string;
  /** Put the unseen-release marker on the button itself: in the sidebar (phones have it on the Account tab). */
  markUnseen?: boolean;
}) {
  const t = useI18n();
  const signOut = useSignOut();
  // Admin areas stay out of sight for everyone else.
  const isAdmin = useQuery(api.admin.roles.isAdmin);
  const unseen = useUpdatesStatus()?.unseen === true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={
            markUnseen && unseen
              ? t("updates.workspaceMenuUnseen")
              : t("shell.workspaceMenu")
          }
          className={cn("justify-start gap-2 px-2 text-foreground", className)}
        >
          <Logo className="text-[13px] font-medium" />
          <ChevronDown
            className="!size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          {markUnseen && unseen && <UnseenMarker className="ml-auto" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound strokeWidth={1.75} />
            {t("nav.account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard strokeWidth={1.75} />
            {t("shell.plans")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={updatesHref}>
            <Sparkles strokeWidth={1.75} />
            {t("updates.title")}
            {unseen && (
              <>
                <UnseenMarker className="ml-auto" />
                <span className="sr-only">{t("updates.unseen")}</span>
              </>
            )}
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/catalog">
              <FileSpreadsheet strokeWidth={1.75} />
              {t("catalogAdmin.menu")}
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/stats">
              <ChartColumn strokeWidth={1.75} />
              {t("adminStats.menu")}
            </Link>
          </DropdownMenuItem>
        )}
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
  );
}
