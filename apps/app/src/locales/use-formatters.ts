"use client";

import { formattersFor } from "@coinslite/i18n";
import { useMemo } from "react";
import { useCurrentLocale } from "./client";

/** Number, date, money and country formatting in the active language and the viewer's time zone. */
export function useFormatters() {
  const locale = useCurrentLocale();
  return useMemo(
    () =>
      formattersFor(locale, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    [locale],
  );
}
