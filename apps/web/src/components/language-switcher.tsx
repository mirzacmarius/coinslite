"use client";

import { localePath } from "@/i18n/routing";
import { rememberLanguage } from "@/lib/language-cookie";
import { type Locale, localeNames, locales } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { Check, ChevronDown, Languages } from "lucide-react";

/**
 * The five languages, each a link to this page in that language. Picking one
 * also stores it, so the site opens in it next time.
 */
export function LanguageSwitcher({
  locale,
  path,
  label,
}: {
  locale: Locale;
  /** This page without its language, e.g. "/privacy". */
  path: string;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${label}: ${localeNames[locale]}`}
        >
          <Languages strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">{localeNames[locale]}</span>
          <ChevronDown strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((value) => (
          <DropdownMenuItem key={value} asChild>
            <a
              href={localePath(value, path)}
              lang={value}
              hrefLang={value}
              aria-current={value === locale ? "page" : undefined}
              onClick={() => rememberLanguage(value)}
            >
              {localeNames[value]}
              {value === locale && (
                <Check
                  className="ml-auto size-4 text-primary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
