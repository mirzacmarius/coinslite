import { UpdatesPage } from "@/components/updates/updates-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("updates.title") };
}

export default function Page() {
  return <UpdatesPage />;
}
