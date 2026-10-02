import { describe, expect, it } from "vitest";

import { preparePlace } from "@/lib/azhk/place";
import {
  findPersonalDataHints,
  redactCellForStorage,
  REDACTED_PERSON,
  REDACTED_SOLE_PROPRIETOR,
  redactPersonalNames,
} from "@/lib/azhk/redact";

// Real address fragments combined with FICTIONAL names in the same shapes the source uses.
const P = REDACTED_PERSON;
const IP = REDACTED_SOLE_PROPRIETOR;

describe("redactPersonalNames", () => {
  it.each([
    [
      "ИП Иванова Г.Р. - г.Алматы, м-он Айгерим-2, ул.Кожаханова,18",
      `${IP} - г.Алматы, м-он Айгерим-2, ул.Кожаханова,18`,
    ],
    ["ИП Петров С.Е., ИП Сидорова А. Б.", `${IP}, ${IP}`],
    ['м-он "Самал-1", д.34 ИП Иванов И.Т., д.19', `м-он "Самал-1", д.34 ${IP}, д.19`],
    ["оф.3этаж ИП Сидоров", `оф.3этаж ${IP}`],
    ["ИП Ахметов Ахмет Ахметович, ул. Манат", `${IP}, ул. Манат`],
    ['ИП "Береке" - ул. Манат, д.1', `${IP} - ул. Манат, д.1`],
    ["ИП И.И. Петров, ул. Манат", `${IP}, ул. Манат`],
    ["Иванов А.П. -ул.Коммунальная, д.52-52а", `${P} -ул.Коммунальная, д.52-52а`],
    ["ул. Манат, д.3 Жумабекова-Ли А.", `ул. Манат, д.3 ${P}`],
    ["Нурланов Нурлан Сапарулы, ул. Манат", `${P}, ул. Манат`],
    ["гр. Петрова, ул. Манат", `${P}, ул. Манат`],
    ["Ќасымова Ә.Ж. - ул. Манат", `${P} - ул. Манат`],
    ["ИП ЖУМАБЕКОВ А.А., ул. Манат", `${IP}, ул. Манат`],
    ["ИП СЕРГЕЕВ-ЛИ - ул. Манат", `${IP} - ул. Манат`],
    ["ИВАНОВ ИВАН ИВАНОВИЧ, ул. Манат, д.3", `${P}, ул. Манат, д.3`],
    ["НУРЛАНОВ НУРЛАН САПАРҰЛЫ - ул. Манат", `${P} - ул. Манат`],
    ["ул. Манат, д.3 ПЕТРОВА А.Б.", `ул. Манат, д.3 ${P}`],
    ["ИП ИВАНОВА ИРИНА ИВАНОВНА", IP],
  ])("%j", (input, expected) => {
    expect(redactPersonalNames(input)).toBe(expected);
  });

  it("keeps companies, organisations and addresses", () => {
    for (const text of [
      'ТОО "Кадырлы" - ул.Коммунальная, д.2 (Автосалон)',
      'ул.Казыбек би, д.50 ТОО "Корп. Жиhаз"',
      "Акимат Ауэзовский, ЖК Алтын Сарай",
      'м-он "Самал-1", д.19 ТОО "Инж.ком. сети САМАЛ"',
      'ТОО "ТЕХНОСЕРВИС", ГККП "КОЛОС", РГКП, АО "КСЕЛЛ"',
      "жилые дома (частный сектор) м-н Айгерим-1, ул. МТФ ;ул.Азаттык",
    ]) {
      expect(redactPersonalNames(text)).toBe(text);
    }
  });

  it("keeps streets written with initials before the surname", () => {
    for (const text of [
      "мкр. Айгерим-1 ул. Наби; С.Ашимова.",
      "ул. Д.Кунаева, д.5",
      "ул. Б.Момышулы, 12",
    ]) {
      expect(redactPersonalNames(text)).toBe(text);
    }
  });
});

describe("findPersonalDataHints", () => {
  it("is quiet for redacted text and plain addresses", () => {
    expect(findPersonalDataHints(`${IP} - ул. Манат; ${P}`)).toEqual([]);
    expect(findPersonalDataHints("ул. Северное кольцо 86/7")).toEqual([]);
  });

  it("flags a capitalised patronymic left behind", () => {
    expect(findPersonalDataHints("ул. Манат ИВАНОВИЧ")).toEqual(["patronymic-like word"]);
  });

  it("does not flag Kazakh-style street names that end like patronymics", () => {
    expect(findPersonalDataHints("пр. Бауыржан Момышулы, д. 2")).toEqual([]);
  });

  it("flags shapes the rules don't cover, without echoing them", () => {
    const hints = findPersonalDataHints("ИП  Береке-Сервис");
    expect(hints).toEqual(["ИП followed by an unrecognised name"]);
    expect(hints.join(" ")).not.toContain("Береке");
  });
});

describe("preparePlace", () => {
  it("redacts before indexing, so names are neither shown nor searchable", () => {
    const prepared = preparePlace("ИП Иванова Г.Р. - м-он Айгерим-2, ул.Кожаханова,18;  ");
    expect(prepared.place).toBe(`${IP} - м-он Айгерим-2, ул.Кожаханова,18`);
    expect(prepared.placeNormalized).toBe("мкр айгерим 2, ул кожаханова,18");
    expect(prepared.placeNormalized).not.toMatch(/иванова|ип/);
    expect(prepared.privacyHints).toEqual([]);
  });

  it("fixes misencoded letters in the displayed text too", () => {
    expect(preparePlace("ул. Аќжар").place).toBe("ул. Ақжар");
  });
});

describe("redactCellForStorage", () => {
  it("redacts what it can and hides the whole cell when unsure", () => {
    expect(redactCellForStorage("Иванов И.И. - ул. Манат", "HIDDEN")).toBe(`${P} - ул. Манат`);
    expect(redactCellForStorage("ИП «Береке - ул. Манат", "HIDDEN")).toBe("HIDDEN");
    expect(redactCellForStorage("пр. Бауыржан Момышулы, д. 2", "HIDDEN")).toBe(
      "пр. Бауыржан Момышулы, д. 2",
    );
  });
});
