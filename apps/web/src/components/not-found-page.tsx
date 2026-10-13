import { getDictionary } from "@/i18n/dictionary";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { PrimaryAction } from "./actions";
import { SiteHeader } from "./site-header";

const SECTIONS = ["record", "sets", "plans"] as const;

/**
 * An address nothing answers: three empty places cut into the board, the
 * error engraved in them, and the way home or into a drawer of the home page.
 * Its entrance is CSS (`.intro`), so the headline paints with the page.
 */
export function NotFoundPage({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const t = dictionary.notFound;
  const home = localePath(locale);
  return (
    <>
      <SiteHeader locale={locale} path="/" />
      <main id="main" tabIndex={-1} className="lost flex-1">
        <div className="wrap grid-12 items-start gap-y-12">
          <div className="lost__text">
            <h1 className="heading intro max-w-[14ch]" data-step="1">
              {t.title}
            </h1>
            <p className="lead muted intro mt-6 max-w-[36ch]" data-step="2">
              {t.description}
            </p>
            <div className="intro mt-10" data-step="3">
              <PrimaryAction href={home}>{t.home}</PrimaryAction>
            </div>
            <nav aria-label={t.or} className="intro mt-12" data-step="3">
              <p className="label">{t.or}</p>
              <ul className="mt-3 flex flex-wrap gap-x-6">
                {SECTIONS.map((id) => (
                  <li key={id}>
                    <a
                      href={`${home}#${id}`}
                      className="tap draw font-semibold"
                    >
                      {dictionary.header.nav[id]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="lost__tray" aria-hidden="true">
            {/* Three empty places, the error engraved at the bottom of each. */}
            <span className="lost__recess">4</span>
            <span className="lost__recess">0</span>
            <span className="lost__recess">4</span>
          </div>
        </div>
      </main>
    </>
  );
}
