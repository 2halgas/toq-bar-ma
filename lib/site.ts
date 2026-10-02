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
  name: "Тоқ бар ма?",
  tagline: "Плановые отключения света в Алматы",
  description:
    "Неофициальная карта плановых отключений электроэнергии в Алматы по графикам АО «Алатау Жарык Компаниясы».",
  /** Official AZhK page listing weekly planned outage schedules. */
  azhkScheduleUrl: "https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics",
  // TODO: replace with the real repository URL once it exists.
  githubUrl: "https://github.com/",
} as const;
