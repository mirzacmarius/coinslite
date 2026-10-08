import { getI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { PageHeader } from "@coinslite/ui/page-header";
import { Library } from "lucide-react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("nav.collection") };
}

export default async function Page() {
  const t = await getI18n();

  return (
    <>
      <PageHeader title={t("nav.collection")} />
      <EmptyState
        icon={<Library className="size-5" aria-hidden="true" />}
        title={t("placeholder.title")}
        description={t("placeholder.description")}
      />
    </>
  );
}
