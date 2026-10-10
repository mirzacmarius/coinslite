import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/i18n/metadata";
import { legalTexts } from "@/legal";
import { isLocale } from "@coinslite/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale)
    ? pageMetadata(locale, "/privacy", legalTexts.privacy[locale])
    : {};
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage locale={locale} document="privacy" />;
}
