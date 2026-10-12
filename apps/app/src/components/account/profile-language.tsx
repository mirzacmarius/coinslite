"use client";

import {
  isNewerLanguageChange,
  noteLanguageChange,
  rememberLanguage,
  rememberedLanguage,
} from "@/lib/language-cookie";
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
  const changedAt = user?.languageChangedAt;
  // Runs when the profile changes, not on every switch on this device.
  useEffect(() => {
    // Only a change made on another device since this browser's own last
    // choice; already this browser's choice means the language menu that set
    // it is switching. A stale read of the profile right after a switch is
    // older, so it can't undo the switch.
    if (
      preferred &&
      isNewerLanguageChange(changedAt) &&
      preferred !== locale &&
      preferred !== rememberedLanguage()
    ) {
      noteLanguageChange(changedAt);
      rememberLanguage(preferred);
      changeLocale(preferred);
    }
  }, [preferred, changedAt]);
  return null;
}
