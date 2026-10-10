import { LegalPage } from "@/components/legal-page";
import { SiteHeader } from "@/components/site-header";
import { isLocale } from "@coinslite/i18n";
import { notFound } from "next/navigation";

export const metadata = { title: "Terms of use · CoinsLite" };

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <SiteHeader locale={locale} path="/terms" />
      <LegalPage
        title="Terms of use"
        updated="Draft, to be completed before launch"
      >
        <p>
          This is a placeholder. The full terms will cover your account, the
          Free plan and Premium, payments and cancellation, acceptable use, and
          our responsibilities.
        </p>
        <p>
          Values such as Market value and Metal value are estimates to help you
          keep track of your collection, not valuations or financial advice.
        </p>
      </LegalPage>
    </>
  );
}
