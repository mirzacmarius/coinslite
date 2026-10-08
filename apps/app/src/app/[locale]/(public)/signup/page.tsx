import { SignUpFlow } from "@/components/auth/sign-up-flow";
import { env } from "@/env.mjs";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentLocale, getI18n } from "@/locales/server";
import { suggestHomeCurrency } from "@coinslite/i18n";
import { headers } from "next/headers";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.signUp.pageTitle") };
}

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, requestHeaders] = await Promise.all([
    searchParams,
    headers(),
  ]);
  const suggestedCurrency = suggestHomeCurrency({
    acceptLanguage: requestHeaders.get("accept-language"),
    locale: await getCurrentLocale(),
  });
  return (
    <SignUpFlow
      next={safeNextPath(next)}
      suggestedCurrency={suggestedCurrency}
      privacyUrl={`${env.NEXT_PUBLIC_WEB_URL}/privacy`}
      termsUrl={`${env.NEXT_PUBLIC_WEB_URL}/terms`}
    />
  );
}
