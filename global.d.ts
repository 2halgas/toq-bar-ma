import type messages from "./messages/ru.json";
import type { Locale } from "./i18n/routing";

// Typed `useTranslations` keys and locales; ru.json is the source of truth.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
