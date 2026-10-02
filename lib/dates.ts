export const ALMATY_TIME_ZONE = "Asia/Almaty";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ALMATY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Almaty as `YYYY-MM-DD`, regardless of the machine's time zone. */
export function getAlmatyToday(now: Date = new Date()): string {
  const parts = isoDateFormatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Shifts a `YYYY-MM-DD` date by whole days. Pure calendar math, no time zones involved. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new RangeError(`Invalid ISO date: "${isoDate}"`);
  }
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}
