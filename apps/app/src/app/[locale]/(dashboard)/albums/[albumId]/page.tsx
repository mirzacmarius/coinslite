import { AlbumDetail } from "@/components/albums/album-detail";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.albums") };
}

/** The Album comes from the URL, so it's read inside Suspense. */
export default function Page() {
  return (
    <Suspense>
      <AlbumDetail />
    </Suspense>
  );
}
