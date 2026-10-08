"use client";

import { createI18nClient } from "next-international/client";

export const {
  useI18n,
  useScopedI18n,
  I18nProviderClient,
  useChangeLocale,
  useCurrentLocale,
} = createI18nClient({
  en: () => import("./en"),
  nb: () => import("./nb"),
  de: () => import("./de"),
  fr: () => import("./fr"),
  ro: () => import("./ro"),
});
