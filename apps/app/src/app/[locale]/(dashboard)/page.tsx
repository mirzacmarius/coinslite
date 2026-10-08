import { Header } from "@/app/[locale]/(dashboard)/_components/header";
import { getScopedI18n } from "@/locales/server";

export const metadata = {
  title: "Overview",
};

export default async function Page() {
  const t = await getScopedI18n("dashboard");

  return (
    <>
      <Header title={t("headerTitle")} description={t("headerDescription")} />
      <div className="flex h-full w-full bg-secondary px-6 py-8 dark:bg-black">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-2 rounded-lg border border-border bg-card p-6 dark:bg-black">
          <h2 className="text-xl font-medium text-primary">{t("bodyTitle")}</h2>
          <p className="text-sm font-normal text-primary/60">
            {t("bodyDescription")}
          </p>
        </div>
      </div>
    </>
  );
}
