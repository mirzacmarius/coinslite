import { VerifyFromLink } from "@/components/auth/verify-from-link";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.verify.pageTitle") };
}

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <VerifyFromLink next={safeNextPath(next)} />;
}
