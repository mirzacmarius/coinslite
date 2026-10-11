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

/** A dark band closing every page: what CoinsLite is, then its links by kind. */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const t = dictionary.footer;
  const header = dictionary.header;
  const year = await copyrightYear();
  const home = localePath(locale);
  const columns = [
    {
      title: t.product,
      links: [
        { href: `${home}#features`, label: header.features },
        { href: `${home}#plans`, label: header.plans },
      ],
    },
    {
      title: t.account,
      links: [
        { href: appLink(locale, "/signup"), label: header.createAccount },
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
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-10 md:grid-cols-[minmax(0,26rem)_1fr] lg:px-24">
        <div className="flex flex-col gap-5">
          <Logo className="text-[15px] font-medium tracking-[-0.02em]" />
          <p className="max-w-sm text-sm leading-relaxed text-background/65">
            {dictionary.hero.eyebrow}
          </p>
          <p className="text-xs text-background/55">© {year} CoinsLite</p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-background/65">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
