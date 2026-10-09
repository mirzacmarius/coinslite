import { SignInFlow } from "@/components/auth/sign-in-flow";
import { safeNextPath } from "@/lib/next-path";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("auth.signIn.pageTitle") };
}

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SignInFlow next={safeNextPath(next)} />;
}
