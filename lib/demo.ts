import { addDaysToIsoDate, diffInDays } from "@/lib/dates";
import { type Outage } from "@/lib/schema";

/**
 * Demo data is generated for a fixed week and would go stale on a static deploy.
 * This shifts every demo outage by the same number of days so the earliest one
 * falls on `today`, keeping the spacing between dates. Never used for real data.
 */
export function rebaseDemoOutages(outages: readonly Outage[], today: string): Outage[] {
  const earliest = outages.reduce<string | undefined>(
    (min, outage) => (min === undefined || outage.date < min ? outage.date : min),
    undefined,
  );
  if (earliest === undefined) return [];

  const shift = diffInDays(earliest, today);
  if (shift === 0) return [...outages];

  return outages.map((outage) => ({ ...outage, date: addDaysToIsoDate(outage.date, shift) }));
}
