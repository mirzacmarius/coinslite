import { AuthPanelSkeleton } from "@/components/auth/auth-panel";
import { WelcomeFlow } from "@/components/auth/welcome-flow";
import { env } from "@/env.mjs";
import { safeNextPath } from "@/lib/next-path";
import { suggestedHomeCurrency } from "@/lib/suggested-currency";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string }>;

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.welcome.pageTitle") };
}

/** Where to go afterwards and the browser's languages are read inside Suspense. */
async function Welcome({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, suggestedCurrency] = await Promise.all([
    searchParams,
    suggestedHomeCurrency(),
  ]);
  return (
    <WelcomeFlow
      next={safeNextPath(next)}
      suggestedCurrency={suggestedCurrency}
      privacyUrl={`${env.NEXT_PUBLIC_WEB_URL}/privacy`}
      termsUrl={`${env.NEXT_PUBLIC_WEB_URL}/terms`}
    />
  );
}

/** Signed in, but not set up yet: Google and sign-in-link accounts come here first. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthPanelSkeleton />}>
      <Welcome searchParams={searchParams} />
    </Suspense>
  );
}
