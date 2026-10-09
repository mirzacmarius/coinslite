import { getCurrentLocale } from "@/locales/server";
import { suggestHomeCurrency } from "@coinslite/i18n";
import { headers } from "next/headers";

/** The Home currency to preselect, from the browser's languages. Reads the request: call it inside Suspense. */
export async function suggestedHomeCurrency() {
  const [requestHeaders, locale] = await Promise.all([
    headers(),
    getCurrentLocale(),
  ]);
  return suggestHomeCurrency({
    acceptLanguage: requestHeaders.get("accept-language"),
    locale,
  });
}
