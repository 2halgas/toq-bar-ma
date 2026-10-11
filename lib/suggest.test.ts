import { describe, expect, it } from "vitest";

import { editDistance, suggestPlaces } from "@/lib/suggest";

const PLACES = [
  "Гагарина",
  "Айгерим-1",
  "Айгерим-2",
  "Абая",
  "Абаева",
  "Кабанбай батыра",
  "Ратушного",
  "Сатпаева",
  "Жетысу-2",
  "Толе би",
];

describe("editDistance", () => {
  it.each([
    ["гагарина", "гагарина", 0],
    ["гагрина", "гагарина", 1], // missing letter
    ["гагаррина", "гагарина", 1], // extra letter
    ["гагорина", "гагарина", 1], // wrong letter
    ["гаграина", "гагарина", 1], // swapped neighbours
  ])("%s → %s = %i", (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });

  it("gives up past the limit", () => {
    expect(editDistance("гагрна", "гагарина")).toBe(2);
    expect(editDistance("абая", "абаева", 1)).toBe(2);
  });
});

describe("suggestPlaces", () => {
  it.each([
    ["гагрина", ["Гагарина"]],
    ["Гагарнна", ["Гагарина"]],
    ["пр. Гагрина", ["Гагарина"]],
    ["ратушнго", ["Ратушного"]],
    ["кабанбай батра", ["Кабанбай батыра"]],
    ["сатпава", ["Сатпаева"]],
  ])("%s → %j", (query, expected) => {
    expect(suggestPlaces(query, PLACES)).toEqual(expected);
  });

  it("tolerates a typo in an unfinished word", () => {
    expect(suggestPlaces("гагрин", PLACES)).toEqual(["Гагарина"]);
  });

  it("keeps numbers exact and offers every close name", () => {
    expect(suggestPlaces("айгерм 1", PLACES)).toEqual(["Айгерим-1"]);
    expect(suggestPlaces("айгерм", PLACES)).toEqual(["Айгерим-1", "Айгерим-2"]);
  });

  it("works for Latin queries", () => {
    expect(suggestPlaces("gagrina", PLACES)).toEqual(["Гагарина"]);
    expect(suggestPlaces("zhetysy 2", PLACES)).toEqual(["Жетысу-2"]);
  });

  it("doesn't stretch short words or confuse similar streets", () => {
    expect(suggestPlaces("абая", PLACES)).toEqual([]); // exact: the search finds it itself
    expect(suggestPlaces("абаа", PLACES)).toEqual([]); // too short to guess
    expect(suggestPlaces("абаевв", PLACES)).toEqual(["Абаева"]);
    expect(suggestPlaces("толе", PLACES)).toEqual([]);
  });

  it("returns nothing for unrelated or empty queries", () => {
    expect(suggestPlaces("розыбакиева", PLACES)).toEqual([]);
    expect(suggestPlaces("", PLACES)).toEqual([]);
    expect(suggestPlaces("мкр", PLACES)).toEqual([]);
  });

  it("suggests each name once even if written differently", () => {
    expect(suggestPlaces("гагрина", ["Гагарина", "ГАГАРИНА"])).toEqual(["Гагарина"]);
  });
});
