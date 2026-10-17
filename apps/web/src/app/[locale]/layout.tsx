import "@coinslite/ui/globals.css";
import "@/styles/site.css";
import { isLocale, locales } from "@coinslite/i18n";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/i18n/dictionary";
import { Motion } from "@/motion/motion";
import { cn } from "@coinslite/ui/utils";
import { GeistMono } from "geist/font/mono";
import { Familjen_Grotesk, Schibsted_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// Latin Extended covers Norwegian, German, French and Romanian.
const display = Familjen_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});
const body = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

/**
 * Runs before the first paint: content waiting for its reveal is hidden only
 * when scripts run and motion is welcome (`.motion`, see styles/site.css).
 * If the engine still hasn't booted 3 s after the page has loaded (a script
 * failed, or the browser is too old), the page shows itself and stays still.
 */
const flags =
  "var c=document.documentElement.classList;c.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)c.add('motion');addEventListener('load',function(){setTimeout(function(){if(!c.contains('is-booted')){c.add('still');c.remove('motion')}},3000)})";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Every page sits under its language: /en, /nb/privacy, /de/terms. */
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <html
      lang={locale}
      className={cn(display.variable, body.variable, GeistMono.variable)}
      // The shared components keep the app's former Indigo colours here,
      // under site.css's own; the app itself defaults to Obsidian.
      data-palette="indigo"
      suppressHydrationWarning
    >
      <head>
        {/* A fixed, local script: the motion flags (see above). */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: see above */}
        <script dangerouslySetInnerHTML={{ __html: flags }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <a className="skip-link" href="#main" data-no-transition>
          {t.header.skip}
        </a>
        <div id="curtain" aria-hidden="true">
          <div className="curtain__panel">
            <span className="curtain__label" />
          </div>
        </div>
        {children}
        <SiteFooter locale={locale} />
        <Analytics />
        <Suspense fallback={null}>
          <Motion />
        </Suspense>
      </body>
    </html>
  );
}
