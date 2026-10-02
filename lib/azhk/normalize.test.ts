import { describe, expect, it } from "vitest";

import { fixMisencodedChars, matchesPlace, normalizePlace } from "@/lib/azhk/normalize";

// Inputs below are address fragments from real AZhK schedules (no personal data).
describe("normalizePlace", () => {
  it.each([
    ["ул.Ратушного 94,94/1", "ул ратушного 94,94/1"],
    ["ул. Бродского, ул. Веницианова, ул. Верди", "ул бродского, ул веницианова, ул верди"],
    [
      "жилые дома (частный сектор) м-н Айгерим-1, ул. МТФ ;ул.Азаттык",
      "жилые дома (частный сектор) мкр айгерим 1, ул мтф; ул азаттык",
    ],
    [
      "мкр. Айгерим-1 ул. Алматинская; ул. Набережная",
      "мкр айгерим 1 ул алматинская; ул набережная",
    ],
    ['м-он "Самал-1", д.19', "мкр самал 1, д 19"],
    ["мкр.8, д.29-34", "мкр 8, д 29 34"],
    ["мкр. Аксай-5, д.5-9", "мкр аксай 5, д 5 9"],
    ["мкр Жайдарман", "мкр жайдарман"],
    ["микрорайон Шугыла", "мкр шугыла"],
    ["пр-т Абая", "пр абая"],
    ["пр.Абая", "пр абая"],
    ["проспект Абая", "пр абая"],
    ["улица Толе би", "ул толе би"],
    [
      "многоэтажные ж/дома: ул. Северное кольцо №№ 86/7, 86/8",
      "многоэтажные ж/дома: ул северное кольцо №№ 86/7, 86/8",
    ],
    ["п.Кок-Тюбе, ул.Ақтаңгер, д.19/1", "п кок тюбе, ул актангер, д 19/1"],
    ["Ёлочная", "елочная"],
    ["  ул.   Манат,  д.1-15 ", "ул манат, д 1 15"],
  ])("%j → %j", (input, expected) => {
    expect(normalizePlace(input)).toBe(expected);
  });

  it("treats every spelling of the same place identically", () => {
    const spellings = [
      "м-н Айгерим-1",
      "м-он Айгерим-1",
      "мкр. Айгерим-1",
      "мкр Айгерим 1",
      "МКР.АЙГЕРИМ-1",
    ];
    expect(new Set(spellings.map(normalizePlace))).toEqual(new Set(["мкр айгерим 1"]));
  });

  it("only replaces whole-word abbreviations", () => {
    expect(normalizePlace("ул. Улжан")).toBe("ул улжан");
    expect(normalizePlace("ул. Прокофьева")).toBe("ул прокофьева");
    expect(normalizePlace("Мкрн. Мамыр-4")).toBe("мкр мамыр 4");
  });

  it("repairs misencoded Kazakh letters before folding", () => {
    expect(normalizePlace("ул. Аќжар")).toBe("ул акжар");
    expect(normalizePlace("ул. Тўрар Рысќулов")).toBe("ул турар рыскулов");
  });
});

describe("fixMisencodedChars", () => {
  it("maps Ќ/ќ/Ў/ў to Қ/қ/Ұ/ұ and leaves other text alone", () => {
    expect(fixMisencodedChars("ЌЎ ќў Қазақ")).toBe("ҚҰ құ Қазақ");
  });
});

describe("matchesPlace", () => {
  const aigerim = normalizePlace("жилые дома (частный сектор) м-н Айгерим-1, ул. МТФ ;ул.Азаттык");
  const ratushnogo = normalizePlace("ул.Ратушного 94,94/1");
  const samal = normalizePlace('м-он "Самал-1", д.19, м-он "Самал-2", д.104');
  const mkr8 = normalizePlace("мкр.8, д.29-34");
  const aksai = normalizePlace("мкр. Аксай-5, д.5-9");

  it("matches however the user types the abbreviation", () => {
    for (const query of ["мкр Айгерим-1", "м-н айгерим 1", "Мкр. Айгерим 1", "айгерим-1"]) {
      expect(matchesPlace(aigerim, query)).toBe(true);
    }
  });

  it("matches partial input while typing", () => {
    expect(matchesPlace(ratushnogo, "ратуш")).toBe(true);
    expect(matchesPlace(aigerim, "азат")).toBe(true);
  });

  it("allows a street type the source didn't use", () => {
    expect(
      matchesPlace(normalizePlace("Акимат Ауэзовский, ЖК Алтын Сарай"), "ул Алтын Сарай"),
    ).toBe(true);
  });

  it("matches the phrase, not scattered words", () => {
    expect(matchesPlace(samal, "самал 2")).toBe(true);
    expect(matchesPlace(normalizePlace('м-он "Самал-1", д.2'), "самал 2")).toBe(false);
  });

  it("keeps the type for number-only names", () => {
    expect(matchesPlace(mkr8, "мкр 8")).toBe(true);
    expect(matchesPlace(aksai, "мкр 8")).toBe(false);
  });

  it("does not match unrelated places", () => {
    expect(matchesPlace(ratushnogo, "толе би")).toBe(false);
  });

  it("treats empty and type-only queries as match-all", () => {
    expect(matchesPlace(ratushnogo, "")).toBe(true);
    expect(matchesPlace(ratushnogo, "  ул.  ")).toBe(true);
  });
});
