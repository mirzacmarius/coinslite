import { CollectionPreview } from "@/components/collection-preview";
import { SiteHeader } from "@/components/site-header";
import { likelyCurrency } from "@/i18n/currency";
import { getDictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { appLink } from "@/i18n/links";
import { pageMetadata } from "@/i18n/metadata";
import {
  premiumCurrencies,
  premiumPrices,
} from "@coinslite/backend/convex/billing/rules";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { type Locale, formatMoney, isLocale } from "@coinslite/i18n";
import { buttonVariants } from "@coinslite/ui/button";
import {
  Award,
  Ban,
  BookOpen,
  Camera,
  Check,
  FileDown,
  FolderOpen,
  Languages,
  ListChecks,
  type LucideIcon,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, "/") : {};
}

const features = [
  ["catalog", BookOpen],
  ["grades", Award],
  ["albums", FolderOpen],
  ["photos", Camera],
  ["totals", Wallet],
  ["spot", TrendingUp],
  ["sets", ListChecks],
  ["insurance", ShieldCheck],
  ["exports", FileDown],
  ["languages", Languages],
  ["noAds", Ban],
] as const satisfies readonly (readonly [string, LucideIcon])[];

const limit = { limit: freePlan.itemLimit };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const currency = likelyCurrency[locale];
  return (
    <>
      <SiteHeader locale={locale} path="/" />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
          <div className="flex flex-col items-start gap-5">
            <p className="text-[13px] font-medium text-muted-foreground">
              {t.hero.eyebrow}
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {t.hero.title}
            </h1>
            <p className="max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
              {t.hero.lead}
            </p>
            <CallsToAction locale={locale} t={t} />
            <p className="text-xs text-muted-foreground">
              {format(t.hero.note, limit)}
            </p>
          </div>
          <CollectionPreview
            locale={locale}
            currency={currency}
            t={t.preview}
          />
        </section>

        <section
          id="features"
          className="scroll-mt-14 border-t bg-card"
          aria-labelledby="features-title"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <SectionTitle id="features-title" lead={t.features.lead}>
              {t.features.title}
            </SectionTitle>
            <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([key, Icon]) => (
                <li
                  key={key}
                  className="flex flex-col gap-2 bg-card p-5 sm:last:col-span-2"
                >
                  <Icon
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-medium">
                    {t.features[key].title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features[key].text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Plans locale={locale} t={t} />

        <section className="border-t bg-card">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {t.closing.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(t.closing.text, limit)}
              </p>
            </div>
            <CallsToAction locale={locale} t={t} />
          </div>
        </section>
      </main>
    </>
  );
}

type Section = { locale: Locale; t: ReturnType<typeof getDictionary> };

function CallsToAction({ locale, t }: Section) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={appLink(locale, "/signup")}
        className={buttonVariants({ size: "lg" })}
      >
        {t.hero.primary}
      </a>
      <a
        href={appLink(locale, "/login")}
        className={buttonVariants({ size: "lg", variant: "outline" })}
      >
        {t.hero.secondary}
      </a>
    </div>
  );
}

function SectionTitle({
  id,
  lead,
  children,
}: {
  id: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">
        {children}
      </h2>
      <p className="text-muted-foreground">{lead}</p>
    </div>
  );
}

function Plans({ locale, t }: Section) {
  const currency = likelyCurrency[locale];
  const price = (minor: number, priced = currency) =>
    formatMoney(minor, priced, locale);
  return (
    <section
      id="plans"
      className="scroll-mt-14 border-t"
      aria-labelledby="plans-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle id="plans-title" lead={t.plans.lead}>
          {t.plans.title}
        </SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <PlanCard
            name={t.plans.free.name}
            price={t.plans.free.price}
            summary={format(t.plans.free.summary, limit)}
            features={t.plans.free.features}
            cta={t.plans.free.cta}
            href={appLink(locale, "/signup")}
          />
          <PlanCard
            name={t.plans.premium.name}
            price={format(t.plans.premium.monthly, {
              price: price(premiumPrices[currency].month),
            })}
            alternative={format(t.plans.premium.yearly, {
              price: price(premiumPrices[currency].year),
            })}
            summary={t.plans.premium.summary}
            features={t.plans.premium.features}
            cta={t.plans.premium.cta}
            href={appLink(locale, "/signup")}
            featured
          />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,24rem)_1fr] md:items-start">
          <table className="w-full overflow-hidden rounded-lg border bg-card text-[13px]">
            <caption className="pb-2 text-left text-sm font-medium">
              {t.plans.pricesTitle}
            </caption>
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  {t.plans.currency}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-normal">
                  {t.plans.month}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-normal">
                  {t.plans.year}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {premiumCurrencies.map((code) => (
                <tr key={code}>
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    {code}
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {price(premiumPrices[code].month, code)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {price(premiumPrices[code].year, code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:pt-7">
            <p>{t.plans.pricesNote}</p>
            <p>{format(t.plans.cancelNote, limit)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  alternative,
  summary,
  features,
  cta,
  href,
  featured = false,
}: {
  name: string;
  price: string;
  alternative?: string;
  summary: string;
  features: readonly string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "flex flex-col gap-5 rounded-lg border border-primary/40 bg-card p-6 ring-1 ring-primary/20"
          : "flex flex-col gap-5 rounded-lg border bg-card p-6"
      }
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{name}</h3>
        <p className="text-2xl font-semibold tracking-tight">{price}</p>
        <p className="min-h-5 text-[13px] text-muted-foreground">
          {alternative}
        </p>
      </div>
      <p className="text-sm">{summary}</p>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-link"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
      <a
        href={href}
        className={buttonVariants({
          variant: featured ? "default" : "outline",
          className: "self-start",
        })}
      >
        {cta}
      </a>
    </div>
  );
}
