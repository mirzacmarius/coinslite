import { getI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { PageHeader } from "@coinslite/ui/page-header";
import { BookOpen } from "lucide-react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.catalog") };
}

export default async function Page() {
  const t = await getI18n();

  return (
    <>
      <PageHeader title={t("nav.catalog")} />
      <EmptyState
        icon={<BookOpen className="size-5" aria-hidden="true" />}
        title={t("placeholder.title")}
        description={t("placeholder.description")}
      />
    </>
  );
}
