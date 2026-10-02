import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";

import {
  expandTable,
  PLACE_HIDDEN,
  parseScheduleTable,
  sanitizeScheduleHtml,
} from "@/lib/azhk/parse-table";
import { REDACTED_PERSON, REDACTED_SOLE_PROPRIETOR } from "@/lib/azhk/redact";
import { AzhkOutagesFileSchema } from "@/lib/azhk/schema";

const scheduleHtml = readFileSync(join(__dirname, "__fixtures__/schedule.html"), "utf8");
const context = {
  sourceUrl: "https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics/105/5301",
  weekStart: "2026-09-28",
  weekEnd: "2026-10-02",
};
// Every fictional name in the fixture.
const NAMES = ["Иванова", "Петров", "Береке"];

describe("expandTable", () => {
  it("spreads rowspan and colspan so cells land in the right columns", () => {
    const $ = cheerio.load(`
      <table>
        <tr><td rowspan="3">A</td><td>1</td><td rowspan="2">X</td></tr>
        <tr><td>2</td></tr>
        <tr><td colspan="2">wide</td></tr>
      </table>`);
    expect(expandTable($, $("table")[0]!)).toEqual([
      ["A", "1", "X"],
      ["A", "2", "X"],
      ["A", "wide", "wide"],
    ]);
  });
});

describe("parseScheduleTable", () => {
  const result = parseScheduleTable(scheduleHtml, context);
  const places = result.outages.map((outage) => outage.place);

  it("reads every data row and skips title, header, spacer and legend rows", () => {
    expect(result.rowsRead).toBe(9);
    expect(result.outages).toHaveLength(7);
  });

  it("carries РЭС, date and time down through rowspans and blank cells", () => {
    expect(result.outages.map((o) => [o.res, o.date, o.timeFrom, o.timeTo])).toEqual([
      [1, "2026-09-28", "09:00", "17:00"],
      [1, "2026-09-28", "09:00", "17:00"],
      [1, "2026-09-29", "08:00", "17:00"],
      [1, "2026-09-29", "08:00", "17:00"],
      [2, "2026-09-30", "08:00", "17:00"],
      [3, "2026-10-01", "08:00", "17:00"],
      [3, "2026-10-01", "08:00", "17:00"],
    ]);
  });

  it("maps repair types, keeping the raw value", () => {
    expect(result.outages.map((o) => [o.repairType, o.repairTypeRaw])).toEqual([
      ["contractor_works", "подрядный"],
      ["current_repair", "текуший"],
      ["defect_elimination", "устранение дефектов"],
      ["capital_repair", "капитальный"],
      ["current_repair", "текущий ремонт"],
      ["other", "реконструкция"],
      ["current_repair", "текущий"],
    ]);
    expect(result.unknownRepairTypes).toEqual(["реконструкция"]);
  });

  it("extracts substations and keeps line breaks as spaces", () => {
    expect(result.outages[2]?.substations).toEqual(["ТП-1307", "ТП-928", "ТП-1329"]);
    expect(places[1]).toBe("ул. Бродского, ул. Верди ул.Ратушного 94,94/1");
  });

  it("fixes misencoded letters", () => {
    expect(places[4]).toBe("ул. Ақжар, д.5");
    expect(result.outages[4]?.placeNormalized).toBe("ул акжар, д 5");
  });

  it("removes full duplicates and reports invalid rows by table row number", () => {
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.invalid).toEqual([{ row: 11, message: "date: unrecognised «31.09.2026»" }]);
  });

  it("never outputs personal names, and hides places it can't clean", () => {
    expect(places[2]).toBe(
      `${REDACTED_SOLE_PROPRIETOR} - г.Алматы, м-он Айгерим-2, ул.Кожаханова,18`,
    );
    expect(places[3]).toBe(
      `ТОО "Кадырлы" - ул.Коммунальная, д.2; ${REDACTED_PERSON} -ул.Коммунальная, д.52`,
    );
    expect(places[5]).toBe(PLACE_HIDDEN);
    expect(result.outages[5]?.placeNormalized).toBe("");
    expect(result.hiddenPlaces).toEqual([
      { row: 13, message: "ИП followed by an unrecognised name" },
    ]);

    const output = JSON.stringify(result);
    for (const name of NAMES) expect(output).not.toContain(name);
  });

  it("produces unique ids and a file that passes validation", () => {
    expect(new Set(result.outages.map((o) => o.id)).size).toBe(result.outages.length);
    expect(
      AzhkOutagesFileSchema.safeParse({
        source: "azhk",
        title: "город Алматы с 28.09.2026 года по 02.10.2026 года",
        ...context,
        updatedAt: "2026-10-02T10:00:00.000Z",
        outages: result.outages,
      }).success,
    ).toBe(true);
  });

  it("gives rows that differ only in time distinct, stable ids", () => {
    const html = `<table>
      <tr><td>Подразделение</td><td>Дата</td><td>Время</td><td>Диспетчерское</td><td>Вид ремонта</td><td>Место</td></tr>
      <tr><td>РЭС-1</td><td>28.09.2026</td><td>09.00-13.00</td><td>ТП-1</td><td>текущий</td><td>ул. Манат</td></tr>
      <tr><td>РЭС-1</td><td>28.09.2026</td><td>14.00-17.00</td><td>ТП-1</td><td>текущий</td><td>ул. Манат</td></tr>
    </table>`;
    const first = parseScheduleTable(html, context).outages.map((o) => o.id);
    const second = parseScheduleTable(html, context).outages.map((o) => o.id);
    expect(new Set(first).size).toBe(2);
    expect(second).toEqual(first);
  });

  it("fails loudly when the table has no recognisable header", () => {
    expect(() => parseScheduleTable("<table><tr><td>1</td></tr></table>", context)).toThrow(
      /header/,
    );
  });
});

describe("sanitizeScheduleHtml", () => {
  const sanitized = sanitizeScheduleHtml(scheduleHtml, {
    title: "город Алматы с 28.09.2026 года по 02.10.2026 года",
    sourceUrl: context.sourceUrl,
  });

  it("keeps no personal names, scripts or page chrome", () => {
    for (const name of NAMES) expect(sanitized).not.toContain(name);
    expect(sanitized).not.toMatch(/<script|tracking|Меню сайта|<nav/);
    expect(sanitized).toContain(PLACE_HIDDEN);
  });

  it("parses to exactly the same outages as the original page", () => {
    expect(parseScheduleTable(sanitized, context).outages).toEqual(
      parseScheduleTable(scheduleHtml, context).outages,
    );
  });
});
