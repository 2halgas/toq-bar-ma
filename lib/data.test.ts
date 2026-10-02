import { afterEach, describe, expect, it, vi } from "vitest";

import { getOutagesData, OutagesDataError, parseOutagesFile } from "@/lib/data";

describe("parseOutagesFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every issue with its path and the record id", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const raw = {
      isDemo: "yes",
      updatedAt: "2026-10-02T10:00:00+05:00",
      sourceUrl: "https://www.azhk.kz/ru/",
      outages: [
        {
          id: "broken-1",
          district: "almaly",
          street: "ул. Толе би",
          houses: "1",
          date: "2026-10-05",
          timeFrom: "18:00",
          timeTo: "09:00",
          reason: "current_repair",
          sourceUrl: "https://www.azhk.kz/ru/",
        },
      ],
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
      expect.stringMatching(/^isDemo: /),
      'outages[0].timeTo (id "broken-1"): Must be later than timeFrom',
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
