import { AccountPage } from "@/components/account/account-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("account.pageTitle") };
}

export default function Page() {
  return <AccountPage />;
}
