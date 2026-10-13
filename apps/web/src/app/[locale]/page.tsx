import { Also } from "@/components/home/also";
import { Closing } from "@/components/home/closing";
import { Hero } from "@/components/home/hero";
import { Insurance } from "@/components/home/insurance";
import { Plans } from "@/components/home/plans";
import { Privacy } from "@/components/home/privacy";
import { Questions } from "@/components/home/questions";
import { Record } from "@/components/home/record";
import { Sets } from "@/components/home/sets";
import { Statement } from "@/components/home/statement";
import { Value } from "@/components/home/value";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { pageMetadata } from "@/i18n/metadata";
import {
  premiumCurrencies,
  premiumPrices,
} from "@coinslite/backend/convex/billing/rules";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { isLocale } from "@coinslite/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, "/") : {};
}

/**
 * The home page, built as a cabinet (DESIGN.md): the promise and Fig 1, the
 * problem, one coin's record, its value, a Set, the Insurance report, the
 * rest, privacy, plans, questions and the last word.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CoinsLite",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    description: format(t.meta.description, { limit: freePlan.itemLimit }),
    offers: [
      {
        "@type": "Offer",
        name: t.plans.free.name,
        price: "0",
        priceCurrency: "EUR",
      },
      ...premiumCurrencies.map((currency) => ({
        "@type": "Offer",
        name: t.plans.premium.name,
        price: (premiumPrices[currency].month / 100).toFixed(2),
        priceCurrency: currency,
      })),
    ],
  };
  return (
    <>
      <SiteHeader locale={locale} path="/" overlay />
      <main id="main" tabIndex={-1} className="flex-1">
        <Hero locale={locale} t={t} />
        <Statement t={t.statement} />
        <Record locale={locale} t={t.record} />
        <Value t={t.value} />
        <Sets t={t.sets} />
        <Insurance locale={locale} t={t.insurance} />
        <Also t={t.also} />
        <Privacy t={t.privacy} />
        <Plans locale={locale} t={t.plans} />
        <Questions t={t.questions} />
        <Closing locale={locale} t={t.closing} />
      </main>
      <script
        type="application/ld+json"
        // Built here from constants, with "<" escaped.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(app).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
