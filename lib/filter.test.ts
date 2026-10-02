import { describe, expect, it } from "vitest";

import {
  countByDistrict,
  DEFAULT_FILTERS,
  describeDateFilter,
  filterOutages,
  groupOutages,
  resolveDateRange,
  type OutageFilters,
} from "@/lib/filter";
import { type Outage } from "@/lib/schema";

const TODAY = "2026-10-02";

let nextId = 0;
function outage(overrides: Partial<Outage>): Outage {
  nextId += 1;
  return {
    id: `t-${nextId}`,
    district: "almaly",
    street: "ул. Толе би",
    houses: "1–15",
    date: TODAY,
    timeFrom: "09:00",
    timeTo: "17:00",
    reason: "current_repair",
    sourceUrl: "https://www.azhk.kz/ru/",
    ...overrides,
  };
}

function filters(overrides: Partial<OutageFilters>): OutageFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const ids = (outages: Outage[]) => outages.map((item) => item.id);

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

describe("filterOutages", () => {
  const yesterday = outage({ id: "yesterday", date: "2026-10-01" });
  const today = outage({ id: "today", date: TODAY });
  const tomorrow = outage({
    id: "tomorrow",
    date: "2026-10-03",
    district: "medeu",
    street: "пр. Достык",
  });
  const lastWeekDay = outage({ id: "day-7", date: "2026-10-08", street: "ул. Абая" });
  const nextWeek = outage({ id: "day-8", date: "2026-10-09" });
  const all = [yesterday, today, tomorrow, lastWeekDay, nextWeek];

  it("week = today … today+6, excluding past and later dates", () => {
    expect(ids(filterOutages(all, DEFAULT_FILTERS, TODAY))).toEqual(["today", "tomorrow", "day-7"]);
  });

  it("filters by preset and explicit dates", () => {
    expect(ids(filterOutages(all, filters({ date: { kind: "today" } }), TODAY))).toEqual(["today"]);
    expect(ids(filterOutages(all, filters({ date: { kind: "tomorrow" } }), TODAY))).toEqual([
      "tomorrow",
    ]);
    expect(
      ids(filterOutages(all, filters({ date: { kind: "date", date: "2026-10-01" } }), TODAY)),
    ).toEqual(["yesterday"]);
  });

  it("filters by district", () => {
    expect(ids(filterOutages(all, filters({ district: "medeu" }), TODAY))).toEqual(["tomorrow"]);
  });

  it("filters by normalized street query", () => {
    expect(ids(filterOutages(all, filters({ query: "ПР-Т достык" }), TODAY))).toEqual(["tomorrow"]);
  });

  it("combines all filters", () => {
    const combined = filters({ query: "толе", district: "almaly", date: { kind: "today" } });
    expect(ids(filterOutages(all, combined, TODAY))).toEqual(["today"]);
    expect(filterOutages(all, { ...combined, district: "medeu" }, TODAY)).toEqual([]);
  });
});

describe("countByDistrict", () => {
  it("counts every district, including zeros", () => {
    const counts = countByDistrict([
      outage({ district: "almaly" }),
      outage({ district: "almaly" }),
      outage({ district: "turksib" }),
    ]);
    expect(counts).toEqual({
      alatau: 0,
      almaly: 2,
      auezov: 0,
      bostandyk: 0,
      zhetysu: 0,
      medeu: 0,
      nauryzbay: 0,
      turksib: 1,
    });
  });
});

describe("groupOutages", () => {
  it("returns an empty list for no outages", () => {
    expect(groupOutages([])).toEqual([]);
  });

  it("groups by date, then district in alphabetical order, sorted by time and street", () => {
    const groups = groupOutages([
      outage({ id: "b", date: "2026-10-03", district: "turksib" }),
      outage({ id: "c", date: TODAY, district: "medeu", timeFrom: "14:00", timeTo: "18:00" }),
      outage({ id: "d", date: TODAY, district: "medeu", timeFrom: "09:00", street: "ул. Пушкина" }),
      outage({ id: "e", date: TODAY, district: "medeu", timeFrom: "09:00", street: "ул. Зенкова" }),
      outage({ id: "f", date: TODAY, district: "almaly" }),
    ]);

    expect(
      groups.map((day) => ({
        date: day.date,
        districts: day.districts.map((group) => [group.district, ids(group.outages)]),
      })),
    ).toEqual([
      {
        date: TODAY,
        districts: [
          ["almaly", ["f"]],
          ["medeu", ["e", "d", "c"]],
        ],
      },
      { date: "2026-10-03", districts: [["turksib", ["b"]]] },
    ]);
  });

  it("sorts house-numbered streets naturally", () => {
    const [day] = groupOutages([
      outage({ id: "10", street: "мкр. Аксай-10" }),
      outage({ id: "2", street: "мкр. Аксай-2" }),
    ]);
    expect(ids(day?.districts[0]?.outages ?? [])).toEqual(["2", "10"]);
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
