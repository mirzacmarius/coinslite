import { CheckoutConfirmation } from "@/components/billing/checkout-confirmation";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("billing.confirmationTitle") };
}

export default function Page() {
  return <CheckoutConfirmation />;
}
