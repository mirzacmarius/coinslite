import { ResetFlow } from "@/components/auth/reset-flow";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.reset.pageTitle") };
}

export default function Page({
  searchParams,
}: { searchParams: { next?: string } }) {
  return <ResetFlow next={safeNextPath(searchParams.next)} />;
}
