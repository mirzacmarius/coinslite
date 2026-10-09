"use client";

import { Logo } from "@/components/logo";
import {
  AppearanceRadioItems,
  LanguageRadioItems,
} from "@/components/preferences";
import { useSignOut } from "@/components/sign-out";
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
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  Languages,
  LogOut,
  SunMoon,
  UserRound,
} from "lucide-react";
import Link from "next/link";

/** The row at the top of the sidebar (and phone top bar) holding account and preferences. */
export function WorkspaceMenu({ className }: { className?: string }) {
  const t = useI18n();
  const signOut = useSignOut();
  // Admin areas stay out of sight for everyone else.
  const isAdmin = useQuery(api.admin.roles.isAdmin);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t("shell.workspaceMenu")}
          className={cn("justify-start gap-2 px-2 text-foreground", className)}
        >
          <Logo className="text-[13px] font-medium" />
          <ChevronDown
            className="!size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
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
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/catalog">
              <FileSpreadsheet strokeWidth={1.75} />
              {t("catalogAdmin.menu")}
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
