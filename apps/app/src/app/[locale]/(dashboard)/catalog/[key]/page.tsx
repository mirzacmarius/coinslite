import { CatalogGate } from "@/components/catalog/catalog-gate";
import { CatalogNodePage } from "@/components/catalog/catalog-node-page";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { WantlistLink } from "@/components/wantlist/wantlist";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

/** The node comes from the URL, and its level from the search params, so both are read inside Suspense. */
export default function Page() {
  return (
    <CatalogGate>
      <Suspense>
        <CatalogNodePage
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
