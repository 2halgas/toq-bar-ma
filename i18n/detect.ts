import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/routing";

/**
 * Picks the locale for the bare `/` URL: an explicit earlier choice wins, then
 * the browser's languages in order of preference ("kz" is a common mistake for
 * Kazakh), then Russian.
 */
export function detectLocale(browserLanguages: readonly string[], saved: string | null): Locale {
  if (isLocale(saved)) return saved;

  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === "kz") return "kk";
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
