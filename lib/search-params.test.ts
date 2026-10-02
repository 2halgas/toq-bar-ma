import { describe, expect, it } from "vitest";

import { DEFAULT_FILTERS } from "@/lib/filter";
import {
  MAX_QUERY_LENGTH,
  parseFilters,
  serializeFilters,
  toQueryString,
} from "@/lib/search-params";

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe("parseFilters", () => {
  it("returns defaults for an empty URL", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
  });

  it("reads every filter", () => {
    expect(parse("q=%D1%82%D0%BE%D0%BB%D0%B5&date=tomorrow&district=medeu")).toEqual({
      query: "толе",
      date: { kind: "tomorrow" },
      district: "medeu",
    });
    expect(parse("date=2026-10-05").date).toEqual({ kind: "date", date: "2026-10-05" });
  });

  it("falls back to defaults for invalid values", () => {
    expect(parse("date=yesterday&district=Медеуский")).toEqual(DEFAULT_FILTERS);
    expect(parse("date=2026-02-30").date).toEqual(DEFAULT_FILTERS.date);
  });

  it("trims and caps the query", () => {
    expect(parse("q=%20%20abay%20%20").query).toBe("abay");
    expect(parse(`q=${"a".repeat(500)}`).query).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe("serializeFilters", () => {
  it("omits defaults", () => {
    expect(toQueryString(DEFAULT_FILTERS)).toBe("");
    expect(toQueryString({ ...DEFAULT_FILTERS, query: "   " })).toBe("");
  });

  it("writes non-default filters in a stable order", () => {
    const params = serializeFilters({
      query: "Толе би",
      date: { kind: "date", date: "2026-10-05" },
      district: "almaly",
    });
    expect([...params.keys()]).toEqual(["q", "date", "district"]);
    expect(params.get("q")).toBe("Толе би");
    expect(params.get("date")).toBe("2026-10-05");
  });

  it.each([
    { query: "абая", date: { kind: "today" }, district: null },
    { query: "", date: { kind: "week" }, district: "turksib" },
    { query: "шанырак 2", date: { kind: "date", date: "2026-12-31" }, district: "alatau" },
  ] as const)("round-trips %j", (filters) => {
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});
