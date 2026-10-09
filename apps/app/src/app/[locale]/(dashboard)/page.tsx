import { getScopedI18n } from "@/locales/server";
import { Overview } from "./overview";

export async function generateMetadata() {
  const t = await getScopedI18n("dashboard");
  return { title: t("headerTitle") };
}

export default function Page() {
  return <Overview />;
}
