import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseScheduleList, parseScheduleTitle, pickLatestSchedule } from "@/lib/azhk/parse-list";

const listHtml = readFileSync(join(__dirname, "__fixtures__/list.html"), "utf8");

describe("parseScheduleTitle", () => {
  it.each([
    ["город Алматы с 28.09.2026 года по 02.10.2026 года", "2026-09-28", "2026-10-02"],
    ["город Алматы с 31.03.2025 года по 04.04.2025", "2025-03-31", "2025-04-04"],
    ["город  Алматы с 30.12.2024 года\n по 06.01.2025 года", "2024-12-30", "2025-01-06"],
  ])("%j", (title, weekStart, weekEnd) => {
    expect(parseScheduleTitle(title)).toEqual({ weekStart, weekEnd });
  });

  it.each([
    "Алматинская область с 05 января по 10 января 2025",
    "РЭС по г.Алматы",
    "город Алматы с 02.10.2026 года по 28.09.2026 года",
  ])("ignores %j", (title) => {
    expect(parseScheduleTitle(title)).toBeNull();
  });
});

describe("parseScheduleList", () => {
  const links = parseScheduleList(listHtml);

  it("keeps only city schedules, with absolute URLs and no duplicates", () => {
    expect(links).toHaveLength(7);
    expect(links.every((link) => link.url.startsWith("https://www.azhk.kz/ru/"))).toBe(true);
    expect(links.some((link) => link.title.includes("область"))).toBe(false);
  });

  it("reads dates from the title, not the (unreliable) slug", () => {
    const link = links.find((item) => item.url.includes("almatyx1x1"));
    expect(link).toMatchObject({ weekStart: "2025-01-06", weekEnd: "2025-01-10" });
  });
});

describe("pickLatestSchedule", () => {
  it("picks the newest week regardless of page order or overlaps", () => {
    expect(pickLatestSchedule(parseScheduleList(listHtml))).toMatchObject({
      weekStart: "2026-09-28",
      weekEnd: "2026-10-02",
    });
  });

  it("returns undefined for an empty list", () => {
    expect(pickLatestSchedule([])).toBeUndefined();
  });
});
