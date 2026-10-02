import * as cheerio from "cheerio";

import { parseDate } from "@/lib/azhk/values";

export const AZHK_ORIGIN = "https://www.azhk.kz";
export const AZHK_LIST_URL = `${AZHK_ORIGIN}/ru/spetsialnye-razdely/all-graphics`;

export interface ScheduleLink {
  title: string;
  url: string;
  weekStart: string;
  weekEnd: string;
}

/**
 * «город Алматы с 28.09.2026 года по 02.10.2026 года» → dates. The trailing
 * «года» is sometimes missing in the source. Region schedules
 * («Алматинская область …») don't match.
 */
export function parseScheduleTitle(title: string): { weekStart: string; weekEnd: string } | null {
  const match =
    /город\s+Алматы\s+с\s+(\d{1,2}\.\d{1,2}\.\d{4})(?:\s*г(?:ода|\.)?)?\s+по\s+(\d{1,2}\.\d{1,2}\.\d{4})/iu.exec(
      title.replace(/\s+/g, " "),
    );
  if (!match?.[1] || !match[2]) return null;
  const weekStart = parseDate(match[1]);
  const weekEnd = parseDate(match[2]);
  return weekStart && weekEnd && weekStart <= weekEnd ? { weekStart, weekEnd } : null;
}

/** All «город Алматы» schedules on the list page, in page order. */
export function parseScheduleList(html: string, baseUrl: string = AZHK_LIST_URL): ScheduleLink[] {
  const $ = cheerio.load(html);
  const links: ScheduleLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const dates = parseScheduleTitle(title);
    const href = $(element).attr("href");
    if (!dates || !href) return;

    const url = new URL(href, baseUrl).toString();
    if (seen.has(url)) return;
    seen.add(url);
    links.push({ title, url, ...dates });
  });

  return links;
}

/**
 * The newest schedule by its dates — not by position or URL: the page lists
 * oldest first, slugs are unreliable, and weeks sometimes overlap.
 */
export function pickLatestSchedule(links: readonly ScheduleLink[]): ScheduleLink | undefined {
  return [...links].sort(
    (a, b) => b.weekStart.localeCompare(a.weekStart) || b.weekEnd.localeCompare(a.weekEnd),
  )[0];
}
