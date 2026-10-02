import { addDaysToIsoDate, formatDayMonth } from "@/lib/dates";
import { matchesPlace } from "@/lib/azhk/normalize";
import { type AzhkOutage } from "@/lib/azhk/schema";

export const WEEK_LENGTH_DAYS = 7;

export type DateFilter =
  { kind: "today" } | { kind: "tomorrow" } | { kind: "week" } | { kind: "date"; date: string };

export interface OutageFilters {
  /** Free-text place query; normalized the same way as `placeNormalized`. */
  query: string;
  date: DateFilter;
  /** РЭС number, e.g. 3 for «РЭС-3». */
  res: number | null;
}

export const DEFAULT_FILTERS: OutageFilters = {
  query: "",
  date: { kind: "week" },
  res: null,
};

export interface DateRange {
  /** Inclusive, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive, `YYYY-MM-DD`. */
  to: string;
}

/** Concrete inclusive range for a date filter; "week" is today plus the next six days. */
export function resolveDateRange(filter: DateFilter, today: string): DateRange {
  switch (filter.kind) {
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const tomorrow = addDaysToIsoDate(today, 1);
      return { from: tomorrow, to: tomorrow };
    }
    case "week":
      return { from: today, to: addDaysToIsoDate(today, WEEK_LENGTH_DAYS - 1) };
    case "date":
      return { from: filter.date, to: filter.date };
  }
}

/** Human label for the selected period, e.g. "на сегодня", "на 5 октября". */
export function describeDateFilter(filter: DateFilter): string {
  switch (filter.kind) {
    case "today":
      return "на сегодня";
    case "tomorrow":
      return "на завтра";
    case "week":
      return "на неделю";
    case "date":
      return `на ${formatDayMonth(filter.date)}`;
  }
}

export function filterOutages(
  outages: readonly AzhkOutage[],
  filters: OutageFilters,
  today: string,
): AzhkOutage[] {
  const { from, to } = resolveDateRange(filters.date, today);

  return outages.filter(
    (outage) =>
      outage.date >= from &&
      outage.date <= to &&
      (filters.res === null || outage.res === filters.res) &&
      matchesPlace(outage.placeNormalized, filters.query),
  );
}

export interface ResCount {
  res: number;
  count: number;
}

/**
 * Every РЭС present in the schedule (so options don't disappear while filtering),
 * with how many of `matching` belong to it. Sorted by number.
 */
export function countByRes(
  all: readonly AzhkOutage[],
  matching: readonly AzhkOutage[],
): ResCount[] {
  const counts = new Map<number, number>(
    [...new Set(all.map((o) => o.res))].map((res) => [res, 0]),
  );
  for (const outage of matching) counts.set(outage.res, (counts.get(outage.res) ?? 0) + 1);
  return [...counts].map(([res, count]) => ({ res, count })).sort((a, b) => a.res - b.res);
}

export interface ResGroup {
  res: number;
  outages: AzhkOutage[];
}

export interface DayGroup {
  date: string;
  groups: ResGroup[];
}

const placeCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

function compareOutages(a: AzhkOutage, b: AzhkOutage): number {
  return a.timeFrom.localeCompare(b.timeFrom) || placeCollator.compare(a.place, b.place);
}

/**
 * Groups by date (ascending), then by РЭС number; outages inside a group are
 * sorted by start time, then place.
 */
export function groupOutages(outages: readonly AzhkOutage[]): DayGroup[] {
  const byDate = new Map<string, Map<number, AzhkOutage[]>>();

  for (const outage of outages) {
    const byRes = byDate.get(outage.date) ?? new Map<number, AzhkOutage[]>();
    byRes.set(outage.res, [...(byRes.get(outage.res) ?? []), outage]);
    byDate.set(outage.date, byRes);
  }

  return [...byDate.keys()].sort().map((date) => {
    const byRes = byDate.get(date) ?? new Map<number, AzhkOutage[]>();
    return {
      date,
      groups: [...byRes.keys()]
        .sort((a, b) => a - b)
        .map((res) => ({ res, outages: [...(byRes.get(res) ?? [])].sort(compareOutages) })),
    };
  });
}

export type ScheduleCoverage = "covered" | "after-schedule" | "before-schedule";

/**
 * Does the schedule cover the selected range at all? Distinguishes "no outages
 * planned" from "no schedule published for these dates yet".
 */
export function getScheduleCoverage(
  range: DateRange,
  schedule: { weekStart: string; weekEnd: string },
): ScheduleCoverage {
  if (range.from > schedule.weekEnd) return "after-schedule";
  if (range.to < schedule.weekStart) return "before-schedule";
  return "covered";
}
