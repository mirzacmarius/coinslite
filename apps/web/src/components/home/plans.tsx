import { PrimaryAction } from "@/components/actions";
import { likelyCurrency } from "@/i18n/currency";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { appLink } from "@/i18n/links";
import { premiumPrices } from "@coinslite/backend/convex/billing/rules";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { formatMoney, type Locale } from "@coinslite/i18n";

const limit = { limit: freePlan.itemLimit };

/** The two plans side by side. */
export function Plans({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary["plans"];
}) {
  const currency = likelyCurrency[locale];
  const price = (minor: number) => formatMoney(minor, currency, locale);
  const signup = appLink(locale, "/signup");
  return (
    <section id="plans" className="plans" aria-labelledby="plans-title">
      <div className="wrap grid-12">
        <div className="plans__head">
          <h2 id="plans-title" className="heading" data-split="lines">
            {format(t.title, limit)}
          </h2>
          <p className="lead muted mt-6" data-reveal>
            {t.lead}
          </p>
        </div>
        <div className="plans__cards" data-reveal>
          <article className="plan" aria-labelledby="plan-free">
            <div>
              <h3 id="plan-free" className="plan__name">
                {t.free.name}
              </h3>
              <p className="plan__price mt-5">{t.free.price}</p>
              <p className="plan__alt" />
            </div>
            <p>{format(t.free.summary, limit)}</p>
            <ul>
              {t.free.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <PrimaryAction href={signup} className="self-start">
              {t.free.cta}
            </PrimaryAction>
          </article>
          <article
            className="plan plan--premium"
            aria-labelledby="plan-premium"
          >
            <div>
              <h3 id="plan-premium" className="plan__name">
                {t.premium.name}
              </h3>
              <p className="plan__price mt-5">
                {format(t.premium.monthly, {
                  price: price(premiumPrices[currency].month),
                })}
              </p>
              <p className="plan__alt">
                {format(t.premium.yearly, {
                  price: price(premiumPrices[currency].year),
                })}
              </p>
            </div>
            <p>{t.premium.summary}</p>
            <ul>
              {t.premium.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <PrimaryAction href={signup} light className="self-start">
              {t.premium.cta}
            </PrimaryAction>
          </article>
        </div>
      </div>
    </section>
  );
}
