import { AuthPanelSkeleton } from "@/components/auth/auth-panel";
import { SignUpFlow } from "@/components/auth/sign-up-flow";
import { safeNextPath } from "@/lib/next-path";
import { suggestedHomeCurrency } from "@/lib/suggested-currency";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string }>;

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.signUp.pageTitle") };
}

/** Where to go afterwards and the browser's languages are read inside Suspense. */
async function SignUp({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, suggestedCurrency] = await Promise.all([
    searchParams,
    suggestedHomeCurrency(),
  ]);
  return (
    <SignUpFlow
      next={safeNextPath(next)}
      suggestedCurrency={suggestedCurrency}
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
