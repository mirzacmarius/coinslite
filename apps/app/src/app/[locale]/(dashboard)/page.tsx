import { getScopedI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { PageHeader } from "@coinslite/ui/page-header";
import { LayoutDashboard } from "lucide-react";

export async function generateMetadata() {
  const t = await getScopedI18n("dashboard");
  return { title: t("headerTitle") };
}

export default async function Page() {
  const t = await getScopedI18n("dashboard");

  return (
    <>
      <PageHeader
        title={t("headerTitle")}
        description={t("headerDescription")}
      />
      <EmptyState
        icon={<LayoutDashboard className="size-5" aria-hidden="true" />}
        title={t("bodyTitle")}
        description={t("bodyDescription")}
      />
    </>
  );
}
