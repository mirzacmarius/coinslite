import { env } from "@/env";
import type { Locale } from "@coinslite/i18n";

/**
 * A page of the app, opened in the language the visitor reads this site in:
 * the app takes the language from `lang` (apps/app/src/proxy.ts).
 */
export const appLink = (locale: Locale, path: "/login" | "/signup") =>
  `${env.NEXT_PUBLIC_APP_URL}${path}?lang=${locale}`;
