/** Production address on Cloudflare Pages. */
const PRODUCTION_URL = "https://toq-bar-ma.pages.dev";

/**
 * Public URL of the site, used for canonical links, hreflang and OG images:
 * NEXT_PUBLIC_SITE_URL if set (e.g. a custom domain), else on Cloudflare Pages
 * the production address for `main` and the deployment's own URL for previews.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.CF_PAGES === "1") {
    return process.env.CF_PAGES_BRANCH === "main"
      ? PRODUCTION_URL
      : (process.env.CF_PAGES_URL ?? PRODUCTION_URL);
  }
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
