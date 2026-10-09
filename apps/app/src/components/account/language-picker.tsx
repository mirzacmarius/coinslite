"use client";

import { useChooseLanguage } from "@/components/preferences";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { localeNames, locales } from "@coinslite/i18n";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { Languages } from "lucide-react";

/** The interface language as a pill; the choice is saved to the profile. */
export function LanguagePicker() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const chooseLanguage = useChooseLanguage();
  return (
    <PropertyPicker
      icon={Languages}
      label={t("account.preferences.language")}
      value={locale}
      options={locales.map((value) => ({ value, label: localeNames[value] }))}
      onChange={(value) => void chooseLanguage(value)}
      noResults={t("items.noMatches")}
    />
  );
}
