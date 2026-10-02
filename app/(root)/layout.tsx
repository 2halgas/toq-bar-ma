import type { Metadata } from "next";

import { LOCALES } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";

import "../globals.css";

// `/` only forwards to a language version, so it isn't indexed itself.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.name,
  robots: { index: false, follow: true },
  alternates: {
    languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}`])),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
