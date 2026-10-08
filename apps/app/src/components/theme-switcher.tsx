"use client";

import { compactSelectTrigger } from "@/components/compact-select";
import { useI18n } from "@/locales/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@coinslite/ui/select";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const appearanceIcons = { light: Sun, dark: Moon, system: Monitor } as const;
type Appearance = keyof typeof appearanceIcons;
const isAppearance = (value: unknown): value is Appearance =>
  typeof value === "string" && value in appearanceIcons;

/** Light, dark or follow the system. ("Theme" means something else in CoinsLite.) */
export function ThemeSwitcher() {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  // The stored choice is only known in the browser; render "system" until then.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current: Appearance = mounted && isAppearance(theme) ? theme : "system";
  const labels: Record<Appearance, string> = {
    light: t("shell.appearanceLight"),
    dark: t("shell.appearanceDark"),
    system: t("shell.appearanceSystem"),
  };
  const Icon = appearanceIcons[current];

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (isAppearance(value)) setTheme(value);
      }}
    >
      <SelectTrigger
        aria-label={t("shell.appearance")}
        className={compactSelectTrigger}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-[14px] w-[14px]" aria-hidden="true" />
          <span className="text-xs font-medium">{labels[current]}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(appearanceIcons) as Appearance[]).map((value) => (
          <SelectItem key={value} value={value} className="text-sm font-medium">
            {labels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
