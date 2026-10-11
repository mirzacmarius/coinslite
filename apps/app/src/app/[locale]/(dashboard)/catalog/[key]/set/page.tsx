import { CatalogGate } from "@/components/catalog/catalog-gate";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { CatalogSetPage } from "@/components/catalog/catalog-set-page";
import { WantlistLink } from "@/components/wantlist/wantlist";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

/** The Set comes from the URL: the node from the path, the denomination path from the search params. */
export default function Page() {
  return (
    <CatalogGate>
      <Suspense>
        <CatalogSetPage
          actions={
            <>
              <WantlistLink />
              <CatalogSearchButton />
            </>
          }
        />
      </Suspense>
    </CatalogGate>
  );
}
