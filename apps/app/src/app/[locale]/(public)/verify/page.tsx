import { VerifyFromLink } from "@/components/auth/verify-from-link";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.verify.pageTitle") };
}

export default function Page({
  searchParams,
}: { searchParams: { next?: string } }) {
  return <VerifyFromLink next={safeNextPath(searchParams.next)} />;
}
