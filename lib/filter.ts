import { addDaysToIsoDate, formatDayMonth } from "@/lib/dates";
import { matchesStreet } from "@/lib/normalize";
import { DISTRICT_IDS, type District, type Outage } from "@/lib/schema";

export const WEEK_LENGTH_DAYS = 7;

export type DateFilter =
  { kind: "today" } | { kind: "tomorrow" } | { kind: "week" } | { kind: "date"; date: string };

export interface OutageFilters {
  /** Free-text street query; normalized when matching. */
  query: string;
  date: DateFilter;
  district: District | null;
}

export const DEFAULT_FILTERS: OutageFilters = {
  query: "",
  date: { kind: "week" },
  district: null,
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
  outages: readonly Outage[],
  filters: OutageFilters,
  today: string,
): Outage[] {
  const { from, to } = resolveDateRange(filters.date, today);

  return outages.filter(
    (outage) =>
      outage.date >= from &&
      outage.date <= to &&
      (filters.district === null || outage.district === filters.district) &&
      matchesStreet(outage.street, filters.query),
  );
}

/** Outage count for every district, including zeros — drives the choropleth. */
export function countByDistrict(outages: readonly Outage[]): Record<District, number> {
  const counts = Object.fromEntries(DISTRICT_IDS.map((district) => [district, 0])) as Record<
    District,
    number
  >;
  for (const outage of outages) counts[outage.district] += 1;
  return counts;
}

export interface DistrictGroup {
  district: District;
  outages: Outage[];
}

export interface DayGroup {
  date: string;
  districts: DistrictGroup[];
}

const streetCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

function compareOutages(a: Outage, b: Outage): number {
  return a.timeFrom.localeCompare(b.timeFrom) || streetCollator.compare(a.street, b.street);
}

/**
 * Groups by date (ascending), then by district (in {@link DISTRICT_IDS} order,
 * which is alphabetical in Russian); outages inside a district are sorted by
 * start time, then street.
 */
export function groupOutages(outages: readonly Outage[]): DayGroup[] {
  const byDate = new Map<string, Map<District, Outage[]>>();

  for (const outage of outages) {
    const byDistrict = byDate.get(outage.date) ?? new Map<District, Outage[]>();
    byDistrict.set(outage.district, [...(byDistrict.get(outage.district) ?? []), outage]);
    byDate.set(outage.date, byDistrict);
  }

  return [...byDate.keys()].sort().map((date) => {
    const byDistrict = byDate.get(date) ?? new Map<District, Outage[]>();
    return {
      date,
      districts: DISTRICT_IDS.filter((district) => byDistrict.has(district)).map((district) => ({
        district,
        outages: [...(byDistrict.get(district) ?? [])].sort(compareOutages),
      })),
    };
  });
}
