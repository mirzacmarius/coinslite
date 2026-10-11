"use client";

import {
  AppearanceRadioItems,
  LanguageRadioItems,
} from "@/components/preferences";
import { useSignOut } from "@/components/sign-out";
import { UnseenMarker } from "@/components/updates/unseen-marker";
import { useUpdatesStatus } from "@/components/updates/use-updates-status";
import { useI18n } from "@/locales/client";
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
import { Logo } from "@coinslite/ui/logo";
import { cn } from "@coinslite/ui/utils";
import { ChevronDown, Languages, LogOut, SunMoon } from "lucide-react";
import Link from "next/link";
import { useSettingsLinks } from "./settings-links";

/** The phone top bar's menu: Settings' links, language and appearance, and signing out. */
export function WorkspaceMenu({
  className,
  markUnseen = false,
}: {
  className?: string;
  /** Put the unseen-release marker on the button itself (phones have it on the Account tab). */
  markUnseen?: boolean;
}) {
  const t = useI18n();
  const signOut = useSignOut();
  const links = useSettingsLinks();
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
          className={cn(
            "justify-start gap-2 px-2 text-foreground hover:bg-sidebar-accent",
            className,
          )}
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
        {links.map(({ href, label, icon: Icon, unseen: linkUnseen }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon strokeWidth={1.75} />
              {label}
              {linkUnseen && (
                <>
                  <UnseenMarker className="ml-auto" />
                  <span className="sr-only">{t("updates.unseen")}</span>
                </>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
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
