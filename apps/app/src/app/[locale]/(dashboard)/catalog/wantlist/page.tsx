import { CatalogGate } from "@/components/catalog/catalog-gate";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { WantlistPage } from "@/components/wantlist/wantlist-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("wantlist.title") };
}

/** The Wantlist goes with the Catalog: hidden with it. */
export default function Page() {
  return (
    <CatalogGate>
      <WantlistPage actions={<CatalogSearchButton />} />
    </CatalogGate>
  );
}
