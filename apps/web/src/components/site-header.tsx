import { localeNames, locales } from "@coinslite/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { getDictionary } from "@/i18n/dictionary";
import { appLink } from "@/i18n/links";
import { localePath } from "@/i18n/routing";
import type { Locale } from "@coinslite/i18n";
import { Logo } from "@coinslite/ui/logo";

const SECTIONS = ["record", "sets", "insurance", "plans", "questions"] as const;

/**
 * The bar on every page: home, the index of the home page's sections (a
 * marker slides to the one you're reading), the language and the way in.
 * On the home page it floats over the opening screen and steps aside while
 * you read down (`overlay`); elsewhere it keeps its place.
 */
export function SiteHeader({
  locale,
  path,
  overlay = false,
}: {
  locale: Locale;
  /** This page without its language, so the switcher can open it in another. */
  path: string;
  overlay?: boolean;
}) {
  const t = getDictionary(locale).header;
  const home = localePath(locale);
  const links = SECTIONS.map((id) => ({
    href: `${home}#${id}`,
    label: t.nav[id],
  }));
  const signIn = appLink(locale, "/login");
  const signUp = appLink(locale, "/signup");
  return (
    <header className="site-header" data-static={overlay ? undefined : ""}>
      <div className="site-header__bar">
        <div className="wrap flex h-full items-center gap-4 lg:gap-8">
          <a
            href={home}
            aria-label={t.home}
            className="logo-link mr-auto shrink-0 lg:mr-2"
          >
            <Logo className="text-[17px] font-semibold tracking-[-0.02em]" />
          </a>
          <nav aria-label={t.sections} className="site-index" data-index>
            {links.map((link) => (
              <a key={link.href} href={link.href} className="tap draw">
                {link.label}
              </a>
            ))}
            <span
              className="site-index__marker"
              data-marker
              aria-hidden="true"
            />
          </nav>
          <div className="flex items-center gap-2 sm:gap-5 lg:ml-auto">
            <span className="max-[479px]:hidden">
              <LanguageSwitcher
                locale={locale}
                path={path}
                label={t.language}
              />
            </span>
            <a
              href={signIn}
              className="tap draw hidden text-sm font-semibold md:inline-flex"
            >
              {t.signIn}
            </a>
            <a href={signUp} className="btn btn--compact" aria-label={t.start}>
              {/* A phone's bar has room for the short label only. */}
              <span
                className="btn__label max-[479px]:hidden"
                data-label={t.start}
              >
                <span>{t.start}</span>
              </span>
              <span
                className="btn__label min-[480px]:hidden"
                data-label={t.startShort}
              >
                <span>{t.startShort}</span>
              </span>
            </a>
            <MobileMenu
              label={t.menu}
              close={t.close}
              links={links}
              actions={[
                { href: signIn, label: t.signIn },
                { href: signUp, label: t.start },
              ]}
              language={t.language}
              languages={locales.map((value) => ({
                locale: value,
                href: localePath(value, path),
                label: localeNames[value],
                current: value === locale,
              }))}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
