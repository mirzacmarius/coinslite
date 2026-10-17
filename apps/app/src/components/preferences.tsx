"use client";

import { setPalette, usePalette } from "@/components/palette";
import {
  noteLanguageChange,
  noteSavingLanguage,
  rememberLanguage,
} from "@/lib/language-cookie";
import {
  type Palette,
  type PaletteSample,
  defaultPalette,
  isPalette,
  paletteSamples,
  palettes,
} from "@/lib/palettes";
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
import { type ReactNode, useCallback } from "react";

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
 * A small "Aa" sample: a page colour, its text and the accent dot, or two
 * split corner to corner. Fixed colours, as it previews a palette or an
 * appearance other than the current one.
 */
function Swatch({
  sample,
  split,
}: {
  sample: PaletteSample;
  split?: PaletteSample;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[5px] border px-1.5 text-xs font-medium leading-none"
      style={{
        color: sample.foreground,
        background: split
          ? `linear-gradient(135deg, ${sample.background} 50%, ${split.background} 50%)`
          : sample.background,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: sample.primary }}
      />
      {/* Over the split sample, the text inverts whatever is beneath it. */}
      <span className={cn(split && "text-white mix-blend-difference")}>Aa</span>
    </span>
  );
}

/** A palette in both its versions, light and dark. */
function PaletteSwatch({ palette }: { palette: Palette }) {
  const samples = paletteSamples[palette];
  return <Swatch sample={samples.light} split={samples.dark} />;
}

/** An appearance in the palette in use. */
function AppearanceSwatch({ appearance }: { appearance: Appearance }) {
  const samples = paletteSamples[usePalette() ?? defaultPalette];
  return appearance === "system" ? (
    <Swatch sample={samples.light} split={samples.dark} />
  ) : (
    <Swatch sample={samples[appearance]} />
  );
}

/**
 * An Account page setting as a menu of samples, Linear-style: the trigger
 * shows the current choice, and the check goes after each sample.
 */
function SampleMenu<T extends string>({
  name,
  describedBy,
  options,
  current,
  labels,
  sample,
  onChange,
}: {
  name: string;
  describedBy?: string;
  options: readonly T[];
  current: T;
  labels: Record<T, string>;
  sample: (option: T) => ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`${name}: ${labels[current]}`}
          aria-describedby={describedBy}
        >
          {sample(current)}
          {labels[current]}
          <ChevronDown
            className="!size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[13.75rem]">
        <DropdownMenuRadioGroup value={current} onValueChange={onChange}>
          {options.map((value) => (
            // The check goes on the right, after the sample, so the
            // radio item's own indicator on the left is hidden.
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="h-8 pl-2 [&>span:first-child]:hidden"
            >
              {sample(value)}
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

/** The Account page's appearance setting. */
export function AppearancePicker({ describedBy }: { describedBy?: string }) {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  const labels = useAppearanceLabels();
  // The stored choice is only known in the browser.
  const hydrated = useHydrated();
  const current: Appearance =
    hydrated && (theme === "light" || theme === "dark") ? theme : "system";
  return (
    <SampleMenu
      name={t("shell.appearance")}
      describedBy={describedBy}
      options={appearances}
      current={current}
      labels={labels}
      sample={(appearance) => <AppearanceSwatch appearance={appearance} />}
      onChange={setTheme}
    />
  );
}

function usePaletteLabels(): Record<Palette, string> {
  const t = useI18n();
  return {
    obsidian: t("shell.coloursObsidian"),
    midnight: t("shell.coloursMidnight"),
    forest: t("shell.coloursForest"),
    plum: t("shell.coloursPlum"),
    indigo: t("shell.coloursIndigo"),
  };
}

function choosePalette(value: string) {
  if (isPalette(value)) setPalette(value);
}

/** The Colours, as radio items for a menu, each with its sample. */
export function PaletteRadioItems() {
  const palette = usePalette() ?? defaultPalette;
  const labels = usePaletteLabels();
  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={choosePalette}>
      {palettes.map((value) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <PaletteSwatch palette={value} />
          {labels[value]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** The Account page's Colours setting. */
export function PalettePicker({ describedBy }: { describedBy?: string }) {
  const t = useI18n();
  const labels = usePaletteLabels();
  return (
    <SampleMenu
      name={t("shell.colours")}
      describedBy={describedBy}
      options={palettes}
      current={usePalette() ?? defaultPalette}
      labels={labels}
      sample={(palette) => <PaletteSwatch palette={palette} />}
      onChange={choosePalette}
    />
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
