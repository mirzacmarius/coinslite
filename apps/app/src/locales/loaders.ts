import type { Locale } from "@coinslite/i18n";
import type { Dictionary } from "./types";

/** One dictionary per supported language; a language without one fails typecheck. */
export const loaders = {
  en: () => import("./en"),
  nb: () => import("./nb"),
  de: () => import("./de"),
  fr: () => import("./fr"),
  ro: () => import("./ro"),
} satisfies Record<Locale, () => Promise<{ default: Dictionary }>>;
