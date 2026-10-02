import { describe, expect, it } from "vitest";

import { outageId } from "@/lib/azhk/id";
import {
  extractSubstations,
  mapRepairType,
  parseDate,
  parseRes,
  parseTimeRange,
} from "@/lib/azhk/values";

describe("parseDate", () => {
  it.each([
    ["28.09.2026", "2026-09-28"],
    ["28.09.2026 г.", "2026-09-28"],
    ["28.09.2026г", "2026-09-28"],
    [" 2.10.2026 ", "2026-10-02"],
  ])("%j → %s", (cell, expected) => {
    expect(parseDate(cell)).toBe(expected);
  });

  it.each(["", "Дата отключения", "31.09.2026", "28/09/2026", "28.09.26"])("rejects %j", (cell) => {
    expect(parseDate(cell)).toBeNull();
  });
});

describe("parseTimeRange", () => {
  it.each([
    ["09.00 -17.00", { from: "09:00", to: "17:00" }],
    ["08.00-17.00", { from: "08:00", to: "17:00" }],
    ["9:00 – 13:30", { from: "09:00", to: "13:30" }],
  ])("%j", (cell, expected) => {
    expect(parseTimeRange(cell)).toEqual(expected);
  });

  it.each(["", "весь день", "25.00-17.00", "09.00"])("rejects %j", (cell) => {
    expect(parseTimeRange(cell)).toBeNull();
  });
});

describe("parseRes", () => {
  it("reads the unit number", () => {
    expect(parseRes("РЭС-1")).toBe(1);
    expect(parseRes("РЭС 7")).toBe(7);
    expect(parseRes("Подразделение")).toBeNull();
  });
});

describe("extractSubstations", () => {
  it.each([
    ['ВЛ-0,4 кВ ТП-1315 выход "Запад"', ["ТП-1315"]],
    ["РУ-0,4 кВ с-1,2 ТП-1510", ["ТП-1510"]],
    ["ТП-1307 выход на РЛНД 111/ТП-928(междуТП-1307-ТП-1329)", ["ТП-1307", "ТП-928", "ТП-1329"]],
    ["ВЛ-10кВ РП-149-ТП-7325", ["ТП-7325"]],
    ["ТП-6142 РУ-0,4кВ", ["ТП-6142"]],
    ["ТП 7588", ["ТП-7588"]],
    ["ВЛ-10кВ РП-149", []],
  ])("%j", (dispatchName, expected) => {
    expect(extractSubstations(dispatchName)).toEqual(expected);
  });
});

describe("mapRepairType", () => {
  it.each([
    ["подрядный", "contractor_works"],
    ["капитальный", "capital_repair"],
    ["текущий", "current_repair"],
    ["текуший", "current_repair"],
    ["Текущий ремонт", "current_repair"],
    ["устранение дефектов", "defect_elimination"],
    ["замена ввода", "other"],
    ["подряд", "contractor_works"],
    ["подрядным", "contractor_works"],
    ["аварийный", "other"],
    ["подрезка деревьев,перетяжка лин.и вводных проводов,вывоз веток", "other"],
    ["Капитальный ремонт.", "capital_repair"],
  ] as const)("%j → %s", (raw, type) => {
    expect(mapRepairType(raw)).toEqual({ type, known: true });
  });

  it("maps unknown values to other and says so", () => {
    expect(mapRepairType("реконструкция")).toEqual({ type: "other", known: false });
  });
});

describe("outageId", () => {
  const base = {
    date: "2026-09-28",
    res: 1,
    dispatchName: "РУ-0,4 кВ ТП-1539",
    place: "ул. Авиационная",
  };

  it("is stable and 12 hex chars", () => {
    expect(outageId(base)).toMatch(/^[0-9a-f]{12}$/);
    expect(outageId(base)).toBe(outageId({ ...base, place: " ул. Авиационная " }));
  });

  it("changes when any identifying field changes", () => {
    const ids = new Set([
      outageId(base),
      outageId({ ...base, date: "2026-09-29" }),
      outageId({ ...base, res: 2 }),
      outageId({ ...base, dispatchName: "ТП-1540" }),
      outageId({ ...base, place: "ул. Иркутская" }),
    ]);
    expect(ids.size).toBe(5);
  });
});
