export const LOCALES = ["ru", "kk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Values for `og:locale`. */
export const OG_LOCALES: Record<Locale, string> = {
  ru: "ru_RU",
  kk: "kk_KZ",
  en: "en_US",
};

/** Native names, shown in the language switcher and on the root page. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  kk: "Қазақша",
  en: "English",
};

/** localStorage key remembering an explicit choice from the switcher. */
export const LOCALE_STORAGE_KEY = "toq-bar-ma:locale";
