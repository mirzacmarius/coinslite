"use client";

import { useI18n } from "@/locales/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@coinslite/ui/select";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
type ThemeChoice = keyof typeof themeIcons;
const isThemeChoice = (value: unknown): value is ThemeChoice =>
  typeof value === "string" && value in themeIcons;

export function ThemeSwitcher() {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  const current: ThemeChoice = isThemeChoice(theme) ? theme : "system";
  const labels: Record<ThemeChoice, string> = {
    light: t("shell.themeLight"),
    dark: t("shell.themeDark"),
    system: t("shell.themeSystem"),
  };
  const Icon = themeIcons[current];

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (isThemeChoice(value)) setTheme(value);
      }}
    >
      <SelectTrigger
        aria-label={t("shell.theme")}
        className="h-6 rounded border-primary/20 bg-secondary !px-2 hover:border-primary/40"
      >
        <div className="flex items-start gap-2">
          <Icon className="h-[14px] w-[14px]" aria-hidden="true" />
          <span className="text-xs font-medium">{labels[current]}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(themeIcons) as ThemeChoice[]).map((value) => (
          <SelectItem key={value} value={value} className="text-sm font-medium">
            {labels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
