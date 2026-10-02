import { describe, expect, it } from "vitest";

import {
  addDaysToIsoDate,
  diffInDays,
  formatDayHeading,
  formatDayMonth,
  formatDuration,
  formatShortDate,
  formatUpdatedAt,
  getAlmatyToday,
  getRelativeDay,
} from "@/lib/dates";

describe("getAlmatyToday", () => {
  it("uses Almaty time (UTC+5), not the machine's time zone", () => {
    expect(getAlmatyToday(new Date("2026-10-01T18:59:00Z"))).toBe("2026-10-01");
    expect(getAlmatyToday(new Date("2026-10-01T19:00:00Z"))).toBe("2026-10-02");
  });
});

describe("addDaysToIsoDate", () => {
  it.each([
    ["2026-10-02", 1, "2026-10-03"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-10-02", 0, "2026-10-02"],
  ])("%s %+d → %s", (date, days, expected) => {
    expect(addDaysToIsoDate(date, days)).toBe(expected);
  });

  it("throws on malformed input", () => {
    expect(() => addDaysToIsoDate("2026-10", 1)).toThrow(RangeError);
  });
});

describe("getRelativeDay", () => {
  it("labels today and tomorrow only", () => {
    expect(getRelativeDay("2026-10-02", "2026-10-02")).toBe("today");
    expect(getRelativeDay("2026-10-03", "2026-10-02")).toBe("tomorrow");
    expect(getRelativeDay("2026-11-01", "2026-10-31")).toBe("tomorrow");
    expect(getRelativeDay("2026-10-04", "2026-10-02")).toBeNull();
    expect(getRelativeDay("2026-10-01", "2026-10-02")).toBeNull();
  });
});

describe("formatting", () => {
  it.each([
    ["ru", "Пятница, 2 октября", "2 октября"],
    ["kk", "2 қазан, жұма", "2 қазан"],
    ["en", "Friday, October 2", "October 2"],
  ])("formats day headings and day-month in %s", (locale, heading, dayMonth) => {
    expect(formatDayHeading("2026-10-02", locale)).toBe(heading);
    expect(formatDayMonth("2026-10-02", locale)).toBe(dayMonth);
  });

  it("capitalises Russian weekdays", () => {
    expect(formatDayHeading("2026-10-05", "ru")).toBe("Понедельник, 5 октября");
  });

  it("formats short dates", () => {
    expect(formatShortDate("2026-10-02", "ru")).toBe("пт, 2 окт.");
    expect(formatShortDate("2026-10-02", "kk")).toBe("2 қаз, жм");
    expect(formatShortDate("2026-10-02", "en")).toBe("Fri, Oct 2");
  });

  it("shows the update time in Almaty on a 24-hour clock", () => {
    expect(formatUpdatedAt("2026-10-02T11:10:00.000Z", "ru")).toBe("2 октября 2026 г. в 16:10");
    expect(formatUpdatedAt("2026-10-02T11:10:00.000Z", "kk")).toBe("2026 ж. 2 қазан, 16:10");
    expect(formatUpdatedAt("2026-10-02T11:10:00.000Z", "en")).toBe("October 2, 2026 at 16:10");
  });

  it("falls back to Russian patterns for an unknown locale", () => {
    expect(formatDayMonth("2026-10-02", "de")).toBe("2 октября");
  });
});

describe("formatDuration", () => {
  const units = { hours: (n: number) => `${n} h`, minutes: (n: number) => `${n} min` };

  it.each([
    ["09:00", "17:00", "8 h"],
    ["09:00", "13:30", "4 h 30 min"],
    ["10:15", "11:00", "45 min"],
    ["10:00", "10:00", "0 min"],
  ])("%s–%s → %s", (from, to, expected) => {
    expect(formatDuration(from, to, units)).toBe(expected);
  });
});

describe("diffInDays", () => {
  it.each([
    ["2026-10-02", "2026-10-02", 0],
    ["2026-10-02", "2026-10-09", 7],
    ["2026-10-09", "2026-10-02", -7],
    ["2026-12-30", "2027-01-02", 3],
    ["2028-02-28", "2028-03-01", 2],
  ])("%s → %s = %i", (from, to, expected) => {
    expect(diffInDays(from, to)).toBe(expected);
  });
});
