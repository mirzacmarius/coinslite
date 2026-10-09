"use client";

import { rememberLanguage, rememberedLanguage } from "@/lib/language-cookie";
import { useChangeLocale, useCurrentLocale } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";

/**
 * Brings the profile's language to this device: someone who picked Romanian on
 * their phone sees Romanian on their laptop too, once signed in.
 */
export function ProfileLanguage() {
  const user = useQuery(api.users.getUser);
  const locale = useCurrentLocale();
  const changeLocale = useChangeLocale();
  const preferred = user?.language;
  // biome-ignore lint/correctness/useExhaustiveDependencies: follow the profile, not every switch on this device
  useEffect(() => {
    // Already this browser's choice: the language menu that set it is switching.
    if (
      preferred &&
      preferred !== locale &&
      preferred !== rememberedLanguage()
    ) {
      rememberLanguage(preferred);
      changeLocale(preferred);
    }
  }, [preferred]);
  return null;
}
