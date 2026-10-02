import { describe, expect, it } from "vitest";

import { type AzhkOutage } from "@/lib/azhk/schema";
import {
  countByRes,
  DEFAULT_FILTERS,
  describeDateFilter,
  filterOutages,
  getScheduleCoverage,
  groupOutages,
  resolveDateRange,
  type OutageFilters,
} from "@/lib/filter";
import { makeOutage } from "@/lib/test/factories";

const TODAY = "2026-10-02";

const filters = (overrides: Partial<OutageFilters>): OutageFilters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});
const ids = (outages: AzhkOutage[]) => outages.map((item) => item.id);

describe("resolveDateRange", () => {
  it("resolves presets relative to today", () => {
    expect(resolveDateRange({ kind: "today" }, TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(resolveDateRange({ kind: "tomorrow" }, TODAY)).toEqual({
      from: "2026-10-03",
      to: "2026-10-03",
    });
    expect(resolveDateRange({ kind: "week" }, TODAY)).toEqual({ from: TODAY, to: "2026-10-08" });
  });

  it("crosses month boundaries", () => {
    expect(resolveDateRange({ kind: "week" }, "2026-10-28")).toEqual({
      from: "2026-10-28",
      to: "2026-11-03",
    });
  });

  it("uses an explicit date as-is", () => {
    expect(resolveDateRange({ kind: "date", date: "2026-10-05" }, TODAY)).toEqual({
      from: "2026-10-05",
      to: "2026-10-05",
    });
  });
});

describe("describeDateFilter", () => {
  it("labels every kind of date filter", () => {
    expect(describeDateFilter({ kind: "today" })).toBe("на сегодня");
    expect(describeDateFilter({ kind: "tomorrow" })).toBe("на завтра");
    expect(describeDateFilter({ kind: "week" })).toBe("на неделю");
    expect(describeDateFilter({ kind: "date", date: "2026-10-05" })).toBe("на 5 октября");
  });
});

describe("filterOutages", () => {
  const yesterday = makeOutage({ id: "yesterday", date: "2026-10-01" });
  const today = makeOutage({ id: "today", date: TODAY, place: "ул.Ратушного 94,94/1" });
  const tomorrow = makeOutage({
    id: "tomorrow",
    date: "2026-10-03",
    res: 7,
    place: "мкр. Аксай-5, д.5-9",
  });
  const nextWeek = makeOutage({ id: "next-week", date: "2026-10-09" });
  const all = [yesterday, today, tomorrow, nextWeek];

  it("week = today … today+6, excluding past and later dates", () => {
    expect(ids(filterOutages(all, DEFAULT_FILTERS, TODAY))).toEqual(["today", "tomorrow"]);
  });

  it("filters by preset and explicit dates", () => {
    expect(ids(filterOutages(all, filters({ date: { kind: "today" } }), TODAY))).toEqual(["today"]);
    expect(
      ids(filterOutages(all, filters({ date: { kind: "date", date: "2026-10-01" } }), TODAY)),
    ).toEqual(["yesterday"]);
  });

  it("filters by РЭС", () => {
    expect(ids(filterOutages(all, filters({ res: 7 }), TODAY))).toEqual(["tomorrow"]);
  });

  it("searches the normalized place however the user spells it", () => {
    expect(ids(filterOutages(all, filters({ query: "М-Н АКСАЙ 5" }), TODAY))).toEqual(["tomorrow"]);
    expect(ids(filterOutages(all, filters({ query: "ул. Ратушного" }), TODAY))).toEqual(["today"]);
  });

  it("never matches a hidden place", () => {
    const hidden = makeOutage({
      id: "hidden",
      date: TODAY,
      place: "Адрес скрыт",
      placeNormalized: "",
    });
    expect(ids(filterOutages([hidden], filters({ query: "адрес" }), TODAY))).toEqual([]);
  });
});

describe("countByRes", () => {
  it("lists every РЭС in the schedule, counting only matching outages", () => {
    const all = [makeOutage({ res: 3 }), makeOutage({ res: 1 }), makeOutage({ res: 3 })];
    expect(countByRes(all, all.slice(0, 1))).toEqual([
      { res: 1, count: 0 },
      { res: 3, count: 1 },
    ]);
  });
});

describe("groupOutages", () => {
  it("returns an empty list for no outages", () => {
    expect(groupOutages([])).toEqual([]);
  });

  it("groups by date, then РЭС number, sorted by time and place", () => {
    const groups = groupOutages([
      makeOutage({ id: "b", date: "2026-10-03", res: 2 }),
      makeOutage({ id: "c", date: TODAY, res: 6, timeFrom: "14:00" }),
      makeOutage({ id: "d", date: TODAY, res: 6, timeFrom: "09:00", place: "ул. Манат" }),
      makeOutage({ id: "e", date: TODAY, res: 6, timeFrom: "09:00", place: "мкр. Аксай-5" }),
      makeOutage({ id: "f", date: TODAY, res: 1 }),
    ]);

    expect(
      groups.map((day) => [day.date, day.groups.map((group) => [group.res, ids(group.outages)])]),
    ).toEqual([
      [
        TODAY,
        [
          [1, ["f"]],
          [6, ["e", "d", "c"]],
        ],
      ],
      ["2026-10-03", [[2, ["b"]]]],
    ]);
  });
});

describe("getScheduleCoverage", () => {
  const schedule = { weekStart: "2026-09-28", weekEnd: "2026-10-02" };

  it("tells covered ranges from ones the schedule doesn't reach", () => {
    expect(getScheduleCoverage({ from: "2026-10-02", to: "2026-10-08" }, schedule)).toBe("covered");
    expect(getScheduleCoverage({ from: "2026-09-25", to: "2026-09-28" }, schedule)).toBe("covered");
    expect(getScheduleCoverage({ from: "2026-10-03", to: "2026-10-03" }, schedule)).toBe(
      "after-schedule",
    );
    expect(getScheduleCoverage({ from: "2026-09-20", to: "2026-09-27" }, schedule)).toBe(
      "before-schedule",
    );
  });
});
