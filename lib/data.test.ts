import { afterEach, describe, expect, it, vi } from "vitest";

import { getOutagesData, OutagesDataError, parseOutagesFile } from "@/lib/data";
import { makeOutage } from "@/lib/test/factories";

describe("parseOutagesFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every issue with its path and the record id", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const raw = {
      source: "azhk",
      title: "город Алматы с 28.09.2026 года по 02.10.2026 года",
      sourceUrl: "https://www.azhk.kz/ru/",
      weekStart: "2026-09-28",
      weekEnd: "yesterday",
      updatedAt: "2026-10-02T10:00:00+05:00",
      outages: [{ ...makeOutage({ id: "0000000000ab" }), timeFrom: "18:00", timeTo: "09:00" }],
    };

    let error: unknown;
    try {
      parseOutagesFile(raw);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(OutagesDataError);
    const { issues, message } = error as OutagesDataError;
    expect(issues).toEqual([
      expect.stringMatching(/^weekEnd: /),
      'outages[0].timeTo (id "0000000000ab"): Must be later than timeFrom',
    ]);
    expect(message).toContain("data/outages.json failed validation (2 issues)");
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe("bundled data", () => {
  it("data/outages.json is valid", () => {
    expect(() => getOutagesData()).not.toThrow();
  });
});
