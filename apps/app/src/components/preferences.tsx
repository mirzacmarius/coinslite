"use client";

import { rememberLanguage } from "@/lib/language-cookie";
import { useChangeLocale, useCurrentLocale, useI18n } from "@/locales/client";
import { isLocale, localeNames, locales } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { ChevronDown, Languages } from "lucide-react";
import { useTheme } from "next-themes";

/** The five languages, as radio items for a menu. */
export function LanguageRadioItems() {
  const changeLocale = useChangeLocale();
  const locale = useCurrentLocale();
  return (
    <DropdownMenuRadioGroup
      value={locale}
      onValueChange={(value) => {
        if (!isLocale(value)) return;
        rememberLanguage(value);
        changeLocale(value);
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
