/** Production URL: explicit override, else Vercel's production domain, else local dev. */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  url: resolveSiteUrl(),
  /** Brand name, the same in every language; taglines and descriptions live in messages/. */
  name: "Тоқ бар ма?",
  /** Official AZhK page listing weekly planned outage schedules. */
  azhkScheduleUrl: "https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics",
  // TODO: replace with the real repository URL once it exists.
  githubUrl: "https://github.com/",
} as const;
