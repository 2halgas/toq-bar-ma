import { ZapIcon } from "lucide-react";

import { LOCALE_NAMES, LOCALES } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

import { LocaleRedirect } from "./locale-redirect";

/**
 * Static entry point. JavaScript forwards to the right language immediately;
 * without it, the visitor just picks one.
 */
export default function RootPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <LocaleRedirect />
      <span
        className="grid size-12 place-items-center rounded-2xl bg-neutral-900 text-brand"
        aria-hidden
      >
        <ZapIcon className="size-6 fill-current" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <ul className="flex flex-wrap justify-center gap-3">
        {LOCALES.map((locale) => (
          <li key={locale}>
            <a
              href={`/${locale}`}
              hrefLang={locale}
              lang={locale}
              className="inline-flex h-10 items-center rounded-lg border px-4 font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {LOCALE_NAMES[locale]}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
