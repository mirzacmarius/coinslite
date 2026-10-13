import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/dictionary";
import { fill } from "@/i18n/format";
import { localePath } from "@/i18n/routing";
import { type LegalDocument, lastUpdated, legalTexts } from "@/legal";
import { isDraft, type OperatorDetail, operator } from "@/legal/operator";
import { freePlan } from "@coinslite/backend/convex/plans/rules";
import { formatCountry, formatDate, type Locale } from "@coinslite/i18n";
import { TriangleAlert } from "lucide-react";

/** The privacy policy or the terms, in one language. */
export function LegalPage({
  locale,
  document,
}: {
  locale: Locale;
  document: LegalDocument;
}) {
  const t = getDictionary(locale).legal;
  const text = legalTexts[document][locale];
  const path = `/${document}`;
  const values = {
    ...detailValues(locale, t.placeholders),
    limit: freePlan.itemLimit,
  };
  return (
    <>
      <SiteHeader locale={locale} path={path} />
      <main
        id="main"
        className="legal mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6 md:pt-14"
      >
        {/* The title comes first on a phone; on a wide screen the contents
            stand beside it as a sticky sidebar. */}
        <header className="legal__head flex flex-col gap-2">
          <h1 className="legal-title">{text.title}</h1>
          <p className="text-[13px] text-muted-foreground">
            {fill(t.updated, { date: formatDate(lastUpdated, locale) })}
          </p>
        </header>
        <nav aria-labelledby="contents" data-toc className="legal__toc">
          <p id="contents" className="px-2 pb-2 text-xs text-muted-foreground">
            {t.contents}
          </p>
          <ul className="text-[13px]">
            {text.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex min-h-7 items-center rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="legal__body flex min-w-0 flex-col gap-6">
          {(isDraft || locale !== "en") && (
            <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-sm">
              {isDraft && (
                <p className="flex gap-2">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <strong className="font-medium">{t.draft}</strong>
                </p>
              )}
              {locale !== "en" && (
                <p className="text-muted-foreground">
                  {fill(t.governs, {
                    english: (
                      // Another language is another root layout: load it in full.
                      <a
                        href={localePath("en", path)}
                        hrefLang="en"
                        data-no-transition
                        className="text-link underline underline-offset-4"
                      >
                        {t.englishVersion}
                      </a>
                    ),
                  })}
                </p>
              )}
            </div>
          )}
          <p className="text-base text-muted-foreground">{text.description}</p>
          {text.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-28 flex-col gap-3"
            >
              <h2 className="legal-heading pt-2">{section.heading}</h2>
              {section.blocks.map((block) =>
                typeof block === "string" ? (
                  <p key={block} className="text-sm leading-6">
                    {fill(block, values)}
                  </p>
                ) : (
                  <ul
                    key={block.join()}
                    className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 marker:text-muted-foreground"
                  >
                    {block.map((item) => (
                      <li key={item}>{fill(item, values)}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </main>
    </>
  );
}

/** Each operator detail as the text shows it: its value, or a marked placeholder. */
function detailValues(
  locale: Locale,
  labels: ReturnType<typeof getDictionary>["legal"]["placeholders"],
) {
  const label: Record<OperatorDetail, string> = {
    operator: labels.operator,
    address: labels.address,
    email: labels.email,
    law: labels.law,
    authority: labels.authority,
    backupDays: labels.days,
    logDays: labels.days,
  };
  return Object.fromEntries(
    (Object.keys(operator) as OperatorDetail[]).map((detail) => {
      const value = operator[detail];
      if (value === null) {
        return [
          detail,
          <mark
            key={detail}
            className="rounded-sm bg-accent px-1 font-medium text-accent-foreground"
          >
            [{label[detail]}]
          </mark>,
        ];
      }
      if (detail === "law") return [detail, formatCountry(value, locale)];
      if (detail === "email") {
        return [
          detail,
          <a
            key={detail}
            href={`mailto:${value}`}
            className="text-link underline underline-offset-4"
          >
            {value}
          </a>,
        ];
      }
      return [detail, value];
    }),
  );
}
