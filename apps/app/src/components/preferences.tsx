"use client";

import {
  noteLanguageChange,
  noteSavingLanguage,
  rememberLanguage,
} from "@/lib/language-cookie";
import { useHydrated } from "@/lib/use-hydrated";
import { useChangeLocale, useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { type Locale, isLocale, localeNames, locales } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useConvexAuth, useMutation } from "convex/react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";

/**
 * Switches the interface language: stored in this browser and, when signed
 * in, on the profile, so every device the person signs in on uses it.
 */
export function useChooseLanguage() {
  const t = useI18n();
  const changeLocale = useChangeLocale();
  const { isAuthenticated } = useConvexAuth();
  const setLanguage = useMutation(api.account.setLanguage);
  return useCallback(
    async (locale: Locale) => {
      rememberLanguage(locale);
      if (isAuthenticated) {
        noteSavingLanguage();
        // This browser switches anyway; other devices keep the old language.
        const changedAt = await setLanguage({ language: locale }).catch(() => {
          toast.error(t("account.preferences.languageNotSaved"));
          return undefined;
        });
        noteLanguageChange(changedAt);
      }
      changeLocale(locale);
    },
    [changeLocale, isAuthenticated, setLanguage, t],
  );
}

/** The five languages, as radio items for a menu. */
export function LanguageRadioItems() {
  const chooseLanguage = useChooseLanguage();
  const locale = useCurrentLocale();
  return (
    <DropdownMenuRadioGroup
      value={locale}
      onValueChange={(value) => {
        if (isLocale(value)) void chooseLanguage(value);
      }}
    >
      {locales.map((value) => (
        <DropdownMenuRadioItem key={value} value={value} lang={value}>
          {localeNames[value]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

const appearances = ["system", "light", "dark"] as const;
type Appearance = (typeof appearances)[number];

function useAppearanceLabels(): Record<Appearance, string> {
  const t = useI18n();
  return {
    system: t("shell.appearanceSystem"),
    light: t("shell.appearanceLight"),
    dark: t("shell.appearanceDark"),
  };
}

/** Light, dark or follow the system. ("Theme" means something else in CoinsLite.) */
export function AppearanceRadioItems() {
  const { theme, setTheme } = useTheme();
  const labels = useAppearanceLabels();
  return (
    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
      {appearances.map((value) => (
        <DropdownMenuRadioItem key={value} value={value}>
          {labels[value]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/**
 * A small "Aa" sample of an appearance: the page colour, its text and the
 * accent dot. Fixed colours, as it previews a theme other than the current.
 */
function AppearanceSwatch({ appearance }: { appearance: Appearance }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-[5px] border px-1.5 text-[11px] font-medium leading-none",
        appearance === "light" && "border-[#e6e6e8] bg-white text-[#1b1b1f]",
        appearance === "dark" && "border-[#2e2e33] bg-[#151517] text-[#e4e4e7]",
        appearance === "system" &&
          "border-[#8c8c95] bg-[linear-gradient(135deg,#ffffff_50%,#151517_50%)]",
      )}
    >
      <span className="size-1 rounded-full bg-primary" />
      {/* Over the split sample, the text inverts whatever is beneath it. */}
      <span
        className={cn(
          appearance === "system" && "text-white mix-blend-difference",
        )}
      >
        Aa
      </span>
    </span>
  );
}

/** The Account page's appearance setting: a menu of samples, Linear-style. */
export function AppearancePicker({ describedBy }: { describedBy?: string }) {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  const labels = useAppearanceLabels();
  // The stored choice is only known in the browser.
  const hydrated = useHydrated();
  const current: Appearance =
    hydrated && (theme === "light" || theme === "dark") ? theme : "system";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`${t("shell.appearance")}: ${labels[current]}`}
          aria-describedby={describedBy}
        >
          <AppearanceSwatch appearance={current} />
          {labels[current]}
          <ChevronDown
            className="!size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuRadioGroup value={current} onValueChange={setTheme}>
          {appearances.map((value) => (
            // The check goes on the right, after the sample, so the
            // radio item's own indicator on the left is hidden.
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="h-8 pl-2 [&>span:first-child]:hidden"
            >
              <AppearanceSwatch appearance={value} />
              {labels[value]}
              {value === current && (
                <Check className="ml-auto !text-link" aria-hidden="true" />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A language picker for pages outside the app shell, such as sign-in. */
export function LanguageMenu() {
  const t = useI18n();
  const locale = useCurrentLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`${t("common.language")}: ${localeNames[locale]}`}
        >
          <Languages strokeWidth={1.75} aria-hidden="true" />
          {localeNames[locale]}
          <ChevronDown className="!size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LanguageRadioItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
