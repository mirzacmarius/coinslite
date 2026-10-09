import { AuthPanelSkeleton } from "@/components/auth/auth-panel";
import { ResetFlow } from "@/components/auth/reset-flow";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string }>;

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.reset.pageTitle") };
}

/** Where to go afterwards comes from the URL, so it's read inside Suspense. */
async function Reset({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <ResetFlow next={safeNextPath(next)} />;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthPanelSkeleton />}>
      <Reset searchParams={searchParams} />
    </Suspense>
  );
}
