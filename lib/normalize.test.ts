import { describe, expect, it } from "vitest";

import { matchesStreet, normalizeStreet } from "@/lib/normalize";

describe("normalizeStreet", () => {
  it.each([
    ["Толе би", "толе би"],
    ["  ул.   Толе   би  ", "толе би"],
    ["улица Толе би", "толе би"],
    ["пр. Абая", "абая"],
    ["пр-т Абая", "абая"],
    ["проспект Абая", "абая"],
    ["мкр. Шанырак-2", "шанырак 2"],
    ["мкр-н Шанырак 2", "шанырак 2"],
    ["микрорайон Самал-2", "самал 2"],
    ["ул. им. Шевченко", "шевченко"],
    ["Пушкина ул.", "пушкина"],
    ["б-р Бухар жырау", "бухар жырау"],
    ["Тёплая", "теплая"],
    ["Төле би көшесі", "толе би"],
    ["Абай даңғылы", "абай"],
    ["Әуезов", "ауезов"],
    ["«Достык»", "достык"],
    ["Ул.Толе би", "толе би"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeStreet(input)).toBe(expected);
  });

  it("keeps words that only start like a street type", () => {
    expect(normalizeStreet("Пушкина")).toBe("пушкина");
    expect(normalizeStreet("ул. Улжан")).toBe("улжан");
    expect(normalizeStreet("Шолохова")).toBe("шолохова");
    expect(normalizeStreet("Прокофьева")).toBe("прокофьева");
  });
});

describe("matchesStreet", () => {
  it("matches regardless of case, prefixes, ё and Kazakh letters", () => {
    expect(matchesStreet("ул. Толе би", "ТОЛЕ БИ")).toBe(true);
    expect(matchesStreet("ул. Толе би", "Төле би")).toBe(true);
    expect(matchesStreet("пр. Абая", "проспект абая")).toBe(true);
    expect(matchesStreet("ул. Тёплая", "теплая")).toBe(true);
    expect(matchesStreet("мкр. Шанырак-2", "шанырак 2")).toBe(true);
  });

  it("matches partial input while typing", () => {
    expect(matchesStreet("ул. Толе би", "тол")).toBe(true);
    expect(matchesStreet("ул. Розыбакиева", "розы")).toBe(true);
  });

  it("requires every query word, in any order", () => {
    expect(matchesStreet("ул. Утеген батыра", "батыра утеген")).toBe(true);
    expect(matchesStreet("ул. Утеген батыра", "утеген толе")).toBe(false);
  });

  it("does not match unrelated streets", () => {
    expect(matchesStreet("ул. Толе би", "абая")).toBe(false);
    expect(matchesStreet("мкр. Самал-2", "самал 3")).toBe(false);
  });

  it("treats empty or type-only queries as match-all", () => {
    expect(matchesStreet("ул. Толе би", "")).toBe(true);
    expect(matchesStreet("ул. Толе би", "   ")).toBe(true);
    expect(matchesStreet("пр. Абая", "ул.")).toBe(true);
  });
});
