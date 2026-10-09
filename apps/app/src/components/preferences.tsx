"use client";

import { rememberLanguage } from "@/lib/language-cookie";
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
import { useConvexAuth, useMutation } from "convex/react";
import { ChevronDown, Languages } from "lucide-react";
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
        // This browser switches anyway; other devices keep the old language.
        await setLanguage({ language: locale }).catch(() =>
          toast.error(t("account.preferences.languageNotSaved")),
        );
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

const appearances = ["light", "dark", "system"] as const;

/** Light, dark or follow the system. ("Theme" means something else in CoinsLite.) */
export function AppearanceRadioItems() {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  const labels = {
    light: t("shell.appearanceLight"),
    dark: t("shell.appearanceDark"),
    system: t("shell.appearanceSystem"),
  };
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
