import { getScopedI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { LayoutDashboard } from "lucide-react";

export async function generateMetadata() {
  const t = await getScopedI18n("dashboard");
  return { title: t("headerTitle") };
}

export default async function Page() {
  const t = await getScopedI18n("dashboard");

  return (
    <>
      <HeaderBar title={t("headerTitle")} />
      <div className="p-4">
        <EmptyState
          icon={
            <LayoutDashboard
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={t("bodyTitle")}
          description={t("bodyDescription")}
        />
      </div>
    </>
  );
}
