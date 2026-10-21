import { NewItem } from "@/components/items/new-item";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("items.new") };
}

export default function Page() {
  return <NewItem />;
}
