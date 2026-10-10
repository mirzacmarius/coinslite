import { LegalPage } from "@/components/legal-page";
import { SiteHeader } from "@/components/site-header";
import { isLocale } from "@coinslite/i18n";
import { notFound } from "next/navigation";

export const metadata = { title: "Privacy policy · CoinsLite" };

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <SiteHeader locale={locale} path="/privacy" />
      <LegalPage
        title="Privacy policy"
        updated="Draft, to be completed before launch"
      >
        <p>
          This is a placeholder. The full privacy policy will describe what
          CoinsLite stores about you and your collection, why, for how long, who
          processes it on our behalf, and how to export or delete it.
        </p>
        <h2 className="pt-2 text-base font-medium">Coin scanner</h2>
        <p>
          The coin scanner is optional. When you use it, the two photos you take
          of a coin, its front and its back, are sent to Anthropic, which runs
          the AI model that identifies the coin. Nothing is sent to Anthropic
          unless you start a scan. If you add the coin to your collection, the
          photos become that item&apos;s photos; if you don&apos;t, CoinsLite
          deletes them within a few hours.
        </p>
      </LegalPage>
    </>
  );
}
