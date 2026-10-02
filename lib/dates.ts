import { format, type Locale as DateFnsLocale } from "date-fns";
import { enUS, kk, ru } from "date-fns/locale";

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

function toUtcDay(isoDate: string): number {
  const [year = NaN, month = NaN, day = NaN] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); negative if `to` is earlier. */
export function diffInDays(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

export type RelativeDay = "today" | "tomorrow";

/** "today" / "tomorrow" relative to `today` (both `YYYY-MM-DD`), otherwise null. */
export function getRelativeDay(isoDate: string, today: string): RelativeDay | null {
  if (isoDate === today) return "today";
  if (isoDate === addDaysToIsoDate(today, 1)) return "tomorrow";
  return null;
}

/**
 * Per-language patterns. date-fns ships its locale data in the bundle, so the
 * output is identical on the server and in every browser — unlike `Intl`, whose
 * Kazakh month names are missing from Chrome's trimmed ICU data ("M10 2").
 */
const DATE_LOCALES: Record<
  string,
  { locale: DateFnsLocale; heading: string; dayMonth: string; short: string; updatedAt: string }
> = {
  ru: {
    locale: ru,
    heading: "EEEE, d MMMM", // Пятница, 2 октября
    dayMonth: "d MMMM", // 2 октября
    short: "EEEEEE, d MMM", // пт, 2 окт.
    updatedAt: "d MMMM yyyy 'г. в' HH:mm", // 2 октября 2026 г. в 16:10
  },
  kk: {
    locale: kk,
    heading: "d MMMM, EEEE", // 2 қазан, жұма
    dayMonth: "d MMMM", // 2 қазан
    short: "d MMM, EEEEEE", // 2 қаз, жм
    updatedAt: "yyyy 'ж.' d MMMM, HH:mm", // 2026 ж. 2 қазан, 16:10
  },
  en: {
    locale: enUS,
    heading: "EEEE, MMMM d", // Friday, October 2
    dayMonth: "MMMM d", // October 2
    short: "EEE, MMM d", // Fri, Oct 2
    updatedAt: "MMMM d, yyyy 'at' HH:mm", // October 2, 2026 at 16:10
  },
};

function patternsFor(locale: string) {
  return DATE_LOCALES[locale] ?? DATE_LOCALES.ru!;
}

/** A `YYYY-MM-DD` date as a local Date at midnight — only used for formatting its calendar fields. */
function calendarDate(isoDate: string): Date {
  const [year = NaN, month = NaN, day = NaN] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Group heading in the language's own word order: "Пятница, 2 октября", "2 қазан, жұма", "Friday, October 2". */
export function formatDayHeading(isoDate: string, locale: string): string {
  const { locale: dateLocale, heading } = patternsFor(locale);
  const text = format(calendarDate(isoDate), heading, { locale: dateLocale });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Day and month: "2 октября", "2 қазан", "October 2". */
export function formatDayMonth(isoDate: string, locale: string): string {
  const { locale: dateLocale, dayMonth } = patternsFor(locale);
  return format(calendarDate(isoDate), dayMonth, { locale: dateLocale });
}

/** Compact date for map popups: "пт, 2 окт.", "2 қаз, жм", "Fri, Oct 2". */
export function formatShortDate(isoDate: string, locale: string): string {
  const { locale: dateLocale, short } = patternsFor(locale);
  return format(calendarDate(isoDate), short, { locale: dateLocale });
}

/** Wall-clock time in Almaty as a local Date, so date-fns formats Almaty time on any machine. */
function almatyWallClock(isoDateTime: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ALMATY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(isoDateTime))
      .map((part) => [part.type, Number(part.value)]),
  );
  return new Date(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
  );
}

/** Data refresh time in Almaty, 24-hour clock in every language. */
export function formatUpdatedAt(isoDateTime: string, locale: string): string {
  const { locale: dateLocale, updatedAt } = patternsFor(locale);
  return format(almatyWallClock(isoDateTime), updatedAt, { locale: dateLocale });
}

function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export interface DurationUnits {
  hours: (count: number) => string;
  minutes: (count: number) => string;
}

/**
 * Length of an outage window. Unit labels come from the message catalogs
 * ("8 ч", "4 сағ 30 мин", "45 min") rather than `Intl.NumberFormat`, for the
 * same reason as the date patterns above.
 */
export function formatDuration(timeFrom: string, timeTo: string, units: DurationUnits): string {
  const total = Math.max(0, minutesOfDay(timeTo) - minutesOfDay(timeFrom));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours && minutes) return `${units.hours(hours)} ${units.minutes(minutes)}`;
  return hours ? units.hours(hours) : units.minutes(minutes);
}
