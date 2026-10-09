import { AuthPanelSkeleton } from "@/components/auth/auth-panel";
import { VerifyFromLink } from "@/components/auth/verify-from-link";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string }>;

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.verify.pageTitle") };
}

/** Where to go afterwards comes from the URL, so it's read inside Suspense. */
async function Verify({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <VerifyFromLink next={safeNextPath(next)} />;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthPanelSkeleton />}>
      <Verify searchParams={searchParams} />
    </Suspense>
  );
}
