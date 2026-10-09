import { CatalogNodePage } from "@/components/catalog/catalog-node-page";
import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

/** The node comes from the URL, and its level from the search params, so both are read inside Suspense. */
export default function Page() {
  return (
    <Suspense>
      <CatalogNodePage actions={<CatalogSearchButton />} />
    </Suspense>
  );
}
