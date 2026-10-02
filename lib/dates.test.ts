import { describe, expect, it } from "vitest";

import {
  addDaysToIsoDate,
  formatDayHeading,
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
  it("formats day headings in Russian with a capital letter", () => {
    expect(formatDayHeading("2026-10-02")).toBe("Пятница, 2 октября");
    expect(formatDayHeading("2026-10-05")).toBe("Понедельник, 5 октября");
  });

  it("formats short dates", () => {
    expect(formatShortDate("2026-10-02")).toBe("2 окт., пт");
  });

  it("shows the update time in Almaty", () => {
    expect(formatUpdatedAt("2026-10-02T11:10:00.000Z")).toMatch(/2 октября 2026.*16:10/);
  });
});

describe("formatDuration", () => {
  it.each([
    ["09:00", "17:00", "8 ч"],
    ["09:00", "13:30", "4 ч 30 мин"],
    ["10:15", "11:00", "45 мин"],
    ["10:00", "10:00", "0 мин"],
  ])("%s–%s → %s", (from, to, expected) => {
    expect(formatDuration(from, to)).toBe(expected);
  });
});
