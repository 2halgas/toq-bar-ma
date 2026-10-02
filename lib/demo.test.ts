import { describe, expect, it } from "vitest";

import { rebaseDemoOutages } from "@/lib/demo";
import { type Outage } from "@/lib/schema";

function outage(id: string, date: string): Outage {
  return {
    id,
    district: "almaly",
    street: "ул. Толе би",
    houses: "1",
    date,
    timeFrom: "09:00",
    timeTo: "17:00",
    reason: "current_repair",
    sourceUrl: "https://www.azhk.kz/ru/",
  };
}

const dates = (outages: Outage[]) => outages.map((item) => `${item.id}:${item.date}`);

describe("rebaseDemoOutages", () => {
  const week = [outage("b", "2026-10-04"), outage("a", "2026-10-02"), outage("c", "2026-10-08")];

  it("moves stale data forward so it starts today, keeping the gaps", () => {
    expect(dates(rebaseDemoOutages(week, "2026-11-30"))).toEqual([
      "b:2026-12-02",
      "a:2026-11-30",
      "c:2026-12-06",
    ]);
  });

  it("moves future data back to today", () => {
    expect(dates(rebaseDemoOutages(week, "2026-09-30"))[1]).toBe("a:2026-09-30");
  });

  it("leaves data that already starts today untouched", () => {
    expect(rebaseDemoOutages(week, "2026-10-02")).toEqual(week);
  });

  it("does not mutate the input", () => {
    rebaseDemoOutages(week, "2027-01-01");
    expect(week[1]?.date).toBe("2026-10-02");
  });

  it("handles an empty list", () => {
    expect(rebaseDemoOutages([], "2026-10-02")).toEqual([]);
  });
});
