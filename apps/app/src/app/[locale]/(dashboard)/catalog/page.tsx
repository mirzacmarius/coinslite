import { CatalogGate } from "@/components/catalog/catalog-gate";
import { CatalogPage } from "@/components/catalog/catalog-page";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { WantlistLink } from "@/components/wantlist/wantlist";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

export default function Page() {
  return (
    <CatalogGate>
      <CatalogPage
        actions={
          <>
            <WantlistLink />
            <CatalogSearchButton />
          </>
        }
      />
    </CatalogGate>
  );
}
