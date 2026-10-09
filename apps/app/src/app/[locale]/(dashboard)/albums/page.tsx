import { AlbumsPage } from "@/components/albums/albums-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.albums") };
}

export default function Page() {
  return <AlbumsPage />;
}
