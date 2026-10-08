import "@coinslite/ui/globals.css";
import { brand } from "@/lib/brand";
import { I18nProviderClient } from "@/locales/client";
import { getI18n } from "@/locales/server";
import { Toaster } from "@coinslite/ui/toaster";
import { TooltipProvider } from "@coinslite/ui/tooltip";
import { cn } from "@coinslite/ui/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "../convex-client-provider";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: "CoinsLite", description: t("common.appDescription") };
}

export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.lightBackground },
    { media: "(prefers-color-scheme: dark)", color: brand.darkBackground },
  ],
};

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} suppressHydrationWarning>
        <body
          className={cn(
            `${GeistSans.variable} ${GeistMono.variable}`,
            "font-sans antialiased",
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={0}>
              <ConvexClientProvider>
                <I18nProviderClient locale={locale}>
                  {children}
                </I18nProviderClient>
              </ConvexClientProvider>
            </TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
