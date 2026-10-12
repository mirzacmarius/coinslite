import { ItemDetail, ItemDetailSkeleton } from "@/components/items/item-detail";
import { ItemPageTitle } from "@/components/items/item-page-title";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

/** The shell's title; the tab takes the Item's name once it's in (ItemPageTitle). */
export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.collection") };
}

/** The Item comes from the URL, so it's read inside Suspense. */
export default function Page() {
  return (
    <Suspense fallback={<ItemDetailSkeleton />}>
      <ItemPageTitle />
      <ItemDetail />
    </Suspense>
  );
}
