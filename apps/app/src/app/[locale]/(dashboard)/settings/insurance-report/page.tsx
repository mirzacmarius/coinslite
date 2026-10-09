import { InsuranceReportPage } from "@/components/insurance-report/insurance-report-page";
import { getI18n } from "@/locales/server";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("insuranceReport.title") };
}

export default function Page() {
  return <InsuranceReportPage />;
}
