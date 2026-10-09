import { StatsPage } from "@/components/admin/stats-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("adminStats.title") };
}

/** Admins only: the page checks the role, and so does every function it calls. */
export default function Page() {
  return <StatsPage />;
}
