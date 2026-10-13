import { PrimaryAction } from "@/components/actions";
import { CabinetFigure } from "@/components/cabinet/figure";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { appLink } from "@/i18n/links";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import type { Locale } from "@coinslite/i18n";

/**
 * The opening screen: the promise in large type beside the coin cabinet.
 * Its entrance is CSS (`.intro`), so the headline paints with the page.
 */
export function Hero({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap grid-12 hero__grid">
        <div className="hero__text">
          <p className="label intro">{t.hero.kicker}</p>
          <h1 id="hero-title" className="display intro mt-6" data-step="1">
            {t.hero.title}
          </h1>
          <p className="lead muted intro mt-7 max-w-[32ch]" data-step="2">
            {t.hero.lead}
          </p>
          <div
            className="intro mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
            data-step="3"
          >
            <PrimaryAction href={appLink(locale, "/signup")}>
              {t.hero.primary}
            </PrimaryAction>
            <a
              href={appLink(locale, "/login")}
              className="tap draw text-[0.95rem] font-semibold"
            >
              {t.hero.secondary}
            </a>
          </div>
          <p className="intro muted mt-5 text-sm" data-step="3">
            {format(t.hero.note, { limit: freePlan.itemLimit })}
          </p>
        </div>
        <div className="hero__figure intro" data-step="figure">
          <CabinetFigure t={t.figure} />
        </div>
      </div>
    </section>
  );
}
