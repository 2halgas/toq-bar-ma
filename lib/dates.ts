import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

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

export type RelativeDay = "today" | "tomorrow";

/** "today" / "tomorrow" relative to `today` (both `YYYY-MM-DD`), otherwise null. */
export function getRelativeDay(isoDate: string, today: string): RelativeDay | null {
  if (isoDate === today) return "today";
  if (isoDate === addDaysToIsoDate(today, 1)) return "tomorrow";
  return null;
}

/** Group heading, e.g. "Пятница, 2 октября". */
export function formatDayHeading(isoDate: string): string {
  const heading = format(parseISO(isoDate), "EEEE, d MMMM", { locale: ru });
  return heading.charAt(0).toUpperCase() + heading.slice(1);
}

/** Compact date for chips and pickers, e.g. "2 окт., пт". */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM, EEEEEE", { locale: ru });
}

const updatedAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: ALMATY_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Data refresh timestamp shown in Almaty time, e.g. "2 октября 2026 г. в 16:10". */
export function formatUpdatedAt(isoDateTime: string): string {
  return updatedAtFormatter.format(new Date(isoDateTime));
}
