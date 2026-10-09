import { ConfirmEmail } from "@/components/account/confirm-email";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("account.confirmEmail.pageTitle") };
}

/** The link sent to a new email address; works signed in or not. */
export default function Page() {
  return <ConfirmEmail />;
}
