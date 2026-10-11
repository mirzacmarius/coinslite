import "@coinslite/ui/globals.css";
import { SiteFooter } from "@/components/site-footer";
import { isLocale, locales } from "@coinslite/i18n";
import { cn } from "@coinslite/ui/utils";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";

// Latin Extended covers Norwegian, German, French and Romanian.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

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
          `${inter.variable} ${GeistMono.variable}`,
          "flex min-h-dvh flex-col font-sans antialiased",
        )}
      >
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
