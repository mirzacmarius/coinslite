import "@coinslite/ui/globals.css";
import { SiteFooter } from "@/components/site-footer";
import { isLocale, locales } from "@coinslite/i18n";
import { cn } from "@coinslite/ui/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { notFound } from "next/navigation";

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
  return (
    <html lang={locale}>
      <body
        className={cn(
          `${GeistSans.variable} ${GeistMono.variable}`,
          "flex min-h-dvh flex-col font-sans antialiased",
        )}
      >
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
