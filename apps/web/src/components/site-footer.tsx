import { getDictionary } from "@/i18n/dictionary";
import { appLink } from "@/i18n/links";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { Logo } from "@coinslite/ui/logo";
import { cacheLife } from "next/cache";

/** The current year, cached for a day so the prerendered page can carry it. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Velvet, closing every page: what CoinsLite is, its links by kind, the small print. */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const t = dictionary.footer;
  const header = dictionary.header;
  const year = await copyrightYear();
  const home = localePath(locale);
  const columns = [
    {
      title: t.product,
      links: (
        ["record", "sets", "insurance", "plans", "questions"] as const
      ).map((id) => ({
        href: `${home}#${id}`,
        label: header.nav[id],
      })),
    },
    {
      title: t.account,
      links: [
        { href: appLink(locale, "/signup"), label: header.start },
        { href: appLink(locale, "/login"), label: header.signIn },
      ],
    },
    {
      title: t.legal,
      links: [
        { href: localePath(locale, "/privacy"), label: t.privacy },
        { href: localePath(locale, "/terms"), label: t.terms },
      ],
    },
  ];
  return (
    <footer className="velvet site-footer">
      <div className="wrap grid gap-12 md:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="flex flex-col gap-5">
          <Logo className="text-[17px] font-semibold tracking-[-0.02em]" />
          <p className="muted max-w-sm text-sm">{t.tagline}</p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="label mb-5">{column.title}</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="inline-block py-1">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="wrap mt-14 flex flex-wrap justify-between gap-4 border-t border-[var(--c-velvet-line)] pt-6 text-xs">
        <p className="muted">© {year} CoinsLite</p>
        <p className="muted max-w-[60ch] text-balance">{t.colophon}</p>
      </div>
    </footer>
  );
}
