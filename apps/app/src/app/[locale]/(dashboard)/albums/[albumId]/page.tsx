import {
  AlbumDetail,
  AlbumDetailSkeleton,
} from "@/components/albums/album-detail";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

/** The shell's title; the tab takes the Album's name once it's in. */
export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.albums") };
}

/** The Album comes from the URL, so it's read inside Suspense. */
export default function Page() {
  return (
    <Suspense fallback={<AlbumDetailSkeleton />}>
      <AlbumDetail />
    </Suspense>
  );
}
