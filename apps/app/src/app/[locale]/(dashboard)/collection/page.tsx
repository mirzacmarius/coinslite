import { CollectionPage } from "@/components/items/collection-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.collection") };
}

export default function Page() {
  return <CollectionPage />;
}
