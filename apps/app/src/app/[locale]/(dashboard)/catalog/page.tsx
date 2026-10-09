import { CatalogSearchButton } from "@/components/catalog/catalog-search-button";
import { placeholderMetadata } from "@/components/shell/placeholder-metadata";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const generateMetadata = () => placeholderMetadata("catalog");

export default function Page() {
  return (
    <PlaceholderPage section="catalog" actions={<CatalogSearchButton />} />
  );
}
