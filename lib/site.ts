/**
 * Public URL of the site, used for canonical links, hreflang and OG images.
 * Set NEXT_PUBLIC_SITE_URL for production (e.g. https://toq-bar-ma.pages.dev);
 * Cloudflare Pages preview builds fall back to their own deployment URL.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.CF_PAGES_URL) return process.env.CF_PAGES_URL;
  return "http://localhost:3000";
}

export const siteConfig = {
  url: resolveSiteUrl(),
  /** Brand name, the same in every language; taglines and descriptions live in messages/. */
  name: "Тоқ бар ма?",
  /** Official AZhK page listing weekly planned outage schedules. */
  azhkScheduleUrl: "https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics",
  githubUrl: "https://github.com/2halgas/toq-bar-ma",
} as const;
