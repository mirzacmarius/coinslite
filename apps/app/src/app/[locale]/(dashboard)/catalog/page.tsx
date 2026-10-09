import { CatalogPage } from "@/components/catalog/catalog-page";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

export default function Page() {
  return <CatalogPage actions={<CatalogSearchButton />} />;
}
