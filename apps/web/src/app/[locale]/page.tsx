import { outlinedAction, smallCapsLink } from "@/components/actions";
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
import { cn } from "@coinslite/ui/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, "/") : {};
}

const features = [
  "catalog",
  "grades",
  "albums",
  "photos",
  "totals",
  "spot",
  "sets",
  "insurance",
  "exports",
  "languages",
  "noAds",
] as const;

const limit = { limit: freePlan.itemLimit };

/** The page's measure: wide, with generous margins, as one column of type. */
const measure = "mx-auto w-full max-w-7xl px-5 sm:px-10 lg:px-24";

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const currency = likelyCurrency[locale];
  return (
    <>
      <SiteHeader locale={locale} path="/" overlay />
      <main id="main" className="flex-1">
        <Hero t={t} />

        <section className="py-24 md:py-40">
          <div className={cn(measure, "flex flex-col gap-12 md:gap-16")}>
            <p className="max-w-6xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.035em] sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              {t.hero.lead}
            </p>
            <CallsToAction locale={locale} t={t} />
          </div>
        </section>

        <section
          className="border-y bg-card py-24 md:py-32"
          aria-labelledby="preview-title"
        >
          <div className={cn(measure, "flex flex-col gap-12")}>
            <SectionTitle id="preview-title">{t.preview.label}</SectionTitle>
            <div className="mx-auto w-full max-w-3xl">
              <CollectionPreview
                locale={locale}
                currency={currency}
                t={t.preview}
              />
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-28 py-24 md:py-32"
          aria-labelledby="features-title"
        >
          <div className={measure}>
            <SectionTitle id="features-title" lead={t.features.lead}>
              {t.features.title}
            </SectionTitle>
            <ol className="mt-12 border-t">
              {features.map((key, index) => (
                <li
                  key={key}
                  className="grid gap-x-10 gap-y-3 border-b py-10 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,24rem)] md:items-baseline md:py-12"
                >
                  <span className="text-sm tabular-nums text-muted-foreground">
                    /{String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-2xl font-medium tracking-[-0.03em] md:text-4xl">
                    {t.features[key].title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {t.features[key].text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Plans locale={locale} t={t} />

        <section className="py-24 md:py-40" aria-labelledby="closing-title">
          <div className={cn(measure, "flex flex-col gap-12 md:gap-16")}>
            <SectionTitle id="closing-title">{t.closing.title}</SectionTitle>
            <p className="max-w-5xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.035em] sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              {format(t.closing.text, limit)}
            </p>
            <CallsToAction locale={locale} t={t} />
          </div>
        </section>
      </main>
    </>
  );
}

type Section = { locale: Locale; t: ReturnType<typeof getDictionary> };

/**
 * The opening screen: the promise in very large type, its first words
 * muted, over a coin's milled edge, with what the Free plan gives along the
 * bottom.
 */
function Hero({ t }: { t: ReturnType<typeof getDictionary> }) {
  const facts = [
    format(t.hero.note, limit),
    t.features.languages.title,
    t.features.noAds.title,
  ];
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[radial-gradient(120%_90%_at_85%_10%,hsl(36_60%_96%),hsl(32_35%_90%)_55%,hsl(30_18%_84%))] pt-28">
      <CoinEdge className="pointer-events-none absolute -right-[22rem] top-1/2 -z-10 size-[56rem] -translate-y-1/2 text-foreground/[0.07] sm:-right-[16rem] lg:-right-[10rem]" />
      <div className={cn(measure, "flex flex-1 flex-col justify-center")}>
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
          {t.hero.eyebrow}
        </p>
        <h1 className="max-w-6xl text-balance text-[2.75rem] font-medium leading-[0.98] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="text-foreground/60">{t.hero.titleLead}</span>{" "}
          <span>{t.hero.titleRest}</span>
        </h1>
      </div>
      <ul className={cn(measure, "grid gap-4 pb-10 pt-16 sm:grid-cols-3")}>
        {facts.map((fact) => (
          <li
            key={fact}
            className="border-t border-foreground/20 pt-4 text-sm font-medium"
          >
            {fact}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A coin seen edge on: a milled rim and an inner ring, drawn in hairlines. */
function CoinEdge({ className }: { className?: string }) {
  // The milling: one ring of short dashes, 180 of them around the rim.
  const millingRadius = 94;
  const tick = (2 * Math.PI * millingRadius) / 180;
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="0.35">
        <circle cx="100" cy="100" r="98" />
        <circle cx="100" cy="100" r="90" />
        <circle cx="100" cy="100" r="74" />
        <circle cx="100" cy="100" r="72.5" />
        <circle
          cx="100"
          cy="100"
          r={millingRadius}
          strokeWidth="8"
          strokeDasharray={`0.35 ${tick - 0.35}`}
        />
      </g>
    </svg>
  );
}

function CallsToAction({ locale, t }: Section) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <a href={appLink(locale, "/signup")} className={outlinedAction}>
        {t.hero.primary}
      </a>
      <a href={appLink(locale, "/login")} className={smallCapsLink}>
        {t.hero.secondary}
        <span
          aria-hidden="true"
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        >
          →
        </span>
      </a>
    </div>
  );
}

/** A section's name, set modestly above a hairline, with a line of lead-in. */
function SectionTitle({
  id,
  lead,
  children,
}: {
  id: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2
        id={id}
        className="text-2xl font-medium tracking-[-0.03em] md:text-[2rem]"
      >
        {children}
      </h2>
      {lead && <p className="max-w-2xl text-muted-foreground">{lead}</p>}
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
      className="scroll-mt-28 border-y bg-card py-24 md:py-32"
      aria-labelledby="plans-title"
    >
      <div className={measure}>
        <SectionTitle id="plans-title" lead={t.plans.lead}>
          {t.plans.title}
        </SectionTitle>
        <div className="mt-12 grid border-t md:grid-cols-2">
          <PlanColumn
            number="/01"
            name={t.plans.free.name}
            price={t.plans.free.price}
            summary={format(t.plans.free.summary, limit)}
            features={t.plans.free.features}
            cta={t.plans.free.cta}
            href={appLink(locale, "/signup")}
          />
          <PlanColumn
            number="/02"
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
            className="md:border-l md:pl-10"
          />
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-[minmax(0,26rem)_1fr] md:items-start">
          <table className="w-full text-sm">
            <caption className="pb-4 text-left text-xs font-semibold uppercase tracking-[0.16em]">
              {t.plans.pricesTitle}
            </caption>
            <thead>
              <tr className="border-y border-foreground/20 text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 text-left font-normal">
                  {t.plans.currency}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-normal">
                  {t.plans.month}
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-normal">
                  {t.plans.year}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {premiumCurrencies.map((code) => (
                <tr key={code}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {code}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {price(premiumPrices[code].month, code)}
                  </td>
                  <td className="py-2.5 pl-4 text-right tabular-nums">
                    {price(premiumPrices[code].year, code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex max-w-xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground md:pt-9">
            <p>{t.plans.pricesNote}</p>
            <p>{format(t.plans.cancelNote, limit)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanColumn({
  number,
  name,
  price,
  alternative,
  summary,
  features,
  cta,
  href,
  className,
}: {
  number: string;
  name: string;
  price: string;
  alternative?: string;
  summary: string;
  features: readonly string[];
  cta: string;
  href: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-8 border-b py-10 md:border-b-0 md:pr-10",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em]">
          {name}
        </h3>
        <span className="text-sm tabular-nums text-muted-foreground">
          {number}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-4xl font-medium tracking-[-0.04em] md:text-5xl">
          {price}
        </p>
        <p className="min-h-5 text-sm text-muted-foreground">{alternative}</p>
      </div>
      <p className="text-[15px]">{summary}</p>
      <ul className="flex flex-1 flex-col border-t text-[15px]">
        {features.map((feature) => (
          <li key={feature} className="border-b py-3">
            {feature}
          </li>
        ))}
      </ul>
      <a href={href} className={cn(outlinedAction, "self-start")}>
        {cta}
      </a>
    </div>
  );
}
