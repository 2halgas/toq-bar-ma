import { describe, expect, it } from "vitest";

import {
  buildCalendar,
  escapeText,
  foldLine,
  safeUri,
  shortenPlace,
  toUtcStamp,
  type CalendarEvent,
} from "@/lib/calendar";

const EVENT: CalendarEvent = {
  uid: "abc123@toq-bar-ma",
  date: "2026-10-07",
  timeFrom: "09:00",
  timeTo: "17:00",
  summary: "Отключение света: ул. Толе би, 273",
  location: "ул. Толе би, 273; ул. Гагарина",
  description: "Объект: ТП-1210\nВид работ: Текущий ремонт",
  url: "https://www.azhk.kz/ru/schedule",
  reminder: "Плановое отключение света 09:00–17:00",
};

const NOW = new Date("2026-10-05T12:34:56.789Z");

/** Undo line folding, as a calendar app would. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

describe("toUtcStamp", () => {
  it("converts Almaty wall time (UTC+5) to UTC", () => {
    expect(toUtcStamp("2026-10-07", "09:00")).toBe("20261007T040000Z");
    expect(toUtcStamp("2026-10-07", "17:30")).toBe("20261007T123000Z");
  });

  it("rolls back to the previous UTC day for early-morning times", () => {
    expect(toUtcStamp("2026-10-07", "03:00")).toBe("20261006T220000Z");
  });
});

describe("escapeText", () => {
  it("escapes the characters iCalendar reserves", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("safeUri", () => {
  it("strips line breaks so a link can't inject properties", () => {
    expect(safeUri("https://www.azhk.kz/a\r\nATTACH:https://evil.example/x")).toBe(
      "https://www.azhk.kz/aATTACH:https://evil.example/x",
    );
  });

  it("only allows web links", () => {
    expect(() => safeUri("javascript:alert(1)")).toThrow();
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("folds by UTF-8 octets without splitting Cyrillic letters", () => {
    const line = `SUMMARY:${"ж".repeat(100)}`;
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("buildCalendar", () => {
  const ics = buildCalendar([EVENT], NOW);
  const lines = unfold(ics);

  it("is a CRLF-separated VCALENDAR with one event", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("has UTC times, a stable UID and escaped text", () => {
    expect(lines).toContain("UID:abc123@toq-bar-ma");
    expect(lines).toContain("DTSTAMP:20261005T123456Z");
    expect(lines).toContain("DTSTART:20261007T040000Z");
    expect(lines).toContain("DTEND:20261007T120000Z");
    expect(lines).toContain("LOCATION:ул. Толе би\\, 273\\; ул. Гагарина");
    expect(lines).toContain("DESCRIPTION:Объект: ТП-1210\\nВид работ: Текущий ремонт");
  });

  it("reminds the evening before", () => {
    expect(lines).toContain("BEGIN:VALARM");
    expect(lines).toContain("TRIGGER:-PT12H");
  });

  it("never lets field values add lines of their own", () => {
    const hostile = unfold(
      buildCalendar(
        [
          {
            ...EVENT,
            uid: "x\r\nATTACH:y",
            summary: "a\r\nATTACH:b",
            url: "https://www.azhk.kz/a\nATTACH:c",
          },
        ],
        NOW,
      ),
    );
    expect(hostile.filter((line) => line.startsWith("ATTACH"))).toEqual([]);
  });

  it("puts several outages into one file", () => {
    const two = unfold(buildCalendar([EVENT, { ...EVENT, uid: "def456@toq-bar-ma" }], NOW));
    expect(two.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(2);
  });
});

describe("shortenPlace", () => {
  it("keeps short places and cuts long ones at a word", () => {
    expect(shortenPlace("ул. Толе би, 273")).toBe("ул. Толе би, 273");
    expect(
      shortenPlace(
        "жилые дома (частный сектор) ул. Абдирова; ул. Борзова; ул. Брюсова; ул. Казакова",
      ),
    ).toBe("жилые дома (частный сектор) ул. Абдирова; ул. Борзова; ул…");
  });
});
