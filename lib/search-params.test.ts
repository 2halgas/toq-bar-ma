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
    expect(parse("q=%D1%82%D0%BE%D0%BB%D0%B5&date=tomorrow&res=3")).toEqual({
      query: "толе",
      date: { kind: "tomorrow" },
      res: 3,
    });
    expect(parse("date=2026-10-05").date).toEqual({ kind: "date", date: "2026-10-05" });
  });

  it("falls back to defaults for invalid values", () => {
    expect(parse("date=yesterday&res=РЭС-3")).toEqual(DEFAULT_FILTERS);
    for (const res of ["0", "-1", "1.5", "999", ""]) {
      expect(parse(`res=${res}`).res).toBeNull();
    }
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
      res: 1,
    });
    expect([...params.keys()]).toEqual(["q", "date", "res"]);
    expect(params.get("q")).toBe("Толе би");
    expect(params.get("date")).toBe("2026-10-05");
  });

  it.each([
    { query: "абая", date: { kind: "today" }, res: null },
    { query: "", date: { kind: "week" }, res: 7 },
    { query: "мкр айгерим 1", date: { kind: "date", date: "2026-12-31" }, res: 12 },
  ] as const)("round-trips %j", (filters) => {
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});
