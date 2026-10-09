import { AuthPanelSkeleton } from "@/components/auth/auth-panel";
import { SignUpFlow } from "@/components/auth/sign-up-flow";
import { env } from "@/env.mjs";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentLocale, getI18n } from "@/locales/server";
import { suggestHomeCurrency } from "@coinslite/i18n";
import { headers } from "next/headers";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string }>;

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.signUp.pageTitle") };
}

/** Where to go afterwards and the browser's languages are read inside Suspense. */
async function SignUp({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, requestHeaders, locale] = await Promise.all([
    searchParams,
    headers(),
    getCurrentLocale(),
  ]);
  const suggestedCurrency = suggestHomeCurrency({
    acceptLanguage: requestHeaders.get("accept-language"),
    locale,
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

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthPanelSkeleton />}>
      <SignUp searchParams={searchParams} />
    </Suspense>
  );
}
