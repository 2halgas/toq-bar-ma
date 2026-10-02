import { describe, expect, it } from "vitest";

import { OutageSchema, OutagesFileSchema, type Outage } from "@/lib/schema";

const validOutage: Outage = {
  id: "test-1",
  district: "almaly",
  street: "ул. Толе би",
  houses: "1–15, 21",
  date: "2026-10-05",
  timeFrom: "09:00",
  timeTo: "17:00",
  reason: "current_repair",
  sourceUrl: "https://www.azhk.kz/ru/",
};

function issuesFor(input: unknown) {
  const result = OutageSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("OutageSchema", () => {
  it("accepts a valid outage", () => {
    expect(OutageSchema.parse(validOutage)).toEqual(validOutage);
  });

  it("rejects unknown districts and reasons", () => {
    expect(issuesFor({ ...validOutage, district: "Алмалинский" })).toEqual(["district"]);
    expect(issuesFor({ ...validOutage, reason: "ремонт" })).toEqual(["reason"]);
  });

  it.each(["2026-13-01", "2026-02-30", "05.10.2026", "2026-10-5"])("rejects date %s", (date) => {
    expect(issuesFor({ ...validOutage, date })).toEqual(["date"]);
  });

  it.each(["9:00", "24:00", "09:00:00", "09-00"])("rejects time %s", (timeFrom) => {
    expect(issuesFor({ ...validOutage, timeFrom })).toContain("timeFrom");
  });

  it("requires timeTo to be later than timeFrom", () => {
    expect(issuesFor({ ...validOutage, timeFrom: "17:00", timeTo: "09:00" })).toEqual(["timeTo"]);
    expect(issuesFor({ ...validOutage, timeFrom: "09:00", timeTo: "09:00" })).toEqual(["timeTo"]);
  });

  it("rejects blank strings and non-http source URLs", () => {
    expect(issuesFor({ ...validOutage, street: "   " })).toEqual(["street"]);
    expect(issuesFor({ ...validOutage, sourceUrl: "ftp://azhk.kz" })).toEqual(["sourceUrl"]);
  });
});

describe("OutagesFileSchema", () => {
  const file = {
    isDemo: true,
    updatedAt: "2026-10-02T10:00:00+05:00",
    sourceUrl: "https://www.azhk.kz/ru/",
    outages: [validOutage],
  };

  it("accepts a valid file", () => {
    expect(OutagesFileSchema.safeParse(file).success).toBe(true);
  });

  it("reports duplicate ids at the duplicated record", () => {
    const result = OutagesFileSchema.safeParse({ ...file, outages: [validOutage, validOutage] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["outages", 1, "id"]);
  });
});
