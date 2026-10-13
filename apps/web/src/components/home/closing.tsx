import { PrimaryAction } from "@/components/actions";
import { CoinFace } from "@/components/coin-face";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { appLink } from "@/i18n/links";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import type { Locale } from "@coinslite/i18n";

/** The last word, on the tray's velvet, running into the footer. */
export function Closing({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary["closing"];
}) {
  return (
    <section className="velvet closing" aria-labelledby="closing-title">
      <div className="wrap">
        <div className="closing__head">
          <h2 id="closing-title" className="closing__title" data-split="lines">
            {t.title}
          </h2>
          <span className="closing__recess" aria-hidden="true">
            {/* The date still missing from the example Set, about to be filed. */}
            <span className="closing__coin">
              <CoinFace date="1921" />
            </span>
          </span>
        </div>
        <div className="closing__row">
          <p className="lead muted max-w-[30ch]" data-reveal>
            {format(t.text, { limit: freePlan.itemLimit })}
          </p>
          <div data-reveal>
            <PrimaryAction href={appLink(locale, "/signup")} light>
              {t.cta}
            </PrimaryAction>
          </div>
        </div>
      </div>
    </section>
  );
}
