import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { isLocale, LOCALES, OG_LOCALES } from "@/i18n/routing";
import { getOutagesData } from "@/lib/data";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";

import "../globals.css";

// Every locale is prerendered; anything else (e.g. /de) is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: t("title"),
    description: t("description"),
    applicationName: siteConfig.name,
    keywords: t("keywords").split(", "),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((code) => [code, `/${code}`])),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter((code) => code !== locale).map((code) => OG_LOCALES[code]),
      url: `/${locale}`,
      siteName: siteConfig.name,
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale); // enables static rendering for this locale

  const { updatedAt, sourceUrl } = getOutagesData();
  const t = await getTranslations("Layout");

  return (
    // next-themes sets the class on <html> before hydration, hence suppressHydrationWarning.
    <html lang={locale} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <a
              href="#main"
              className="sr-only z-50 rounded-lg bg-background px-4 py-2 font-medium shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
              {children}
            </main>
            <SiteFooter updatedAt={updatedAt} sourceUrl={sourceUrl} />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
