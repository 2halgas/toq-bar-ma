import { describe, expect, it } from "vitest";

import {
  clipToViewbox,
  matchesOsmName,
  mergeWays,
  overpassNamePattern,
  prepareLines,
  simplifyLine,
  streetCoreName,
  type LatLon,
} from "@/lib/geo/streets";

describe("streetCoreName", () => {
  it.each([
    ["Сатпаева", "Сатпаева"],
    ["Ш.Айманова", "Айманова"],
    ["Р. Зорге", "Зорге"],
    ["Жанкожа  батыра", "Жанкожа батыра"],
    ["1-я Кирпично-Заводская", "1-я Кирпично-Заводская"],
  ])("%s → %s", (name, expected) => {
    expect(streetCoreName(name)).toBe(expected);
  });
});

describe("matchesOsmName", () => {
  it("accepts the OSM spelling with or without a type word", () => {
    expect(matchesOsmName("улица Сатпаева", "Сатпаева")).toBe(true);
    expect(matchesOsmName("проспект Гагарина", "Гагарина")).toBe(true); // bare names default to «ул»
    expect(matchesOsmName("Сатпаева", "Сатпаева")).toBe(true);
    expect(matchesOsmName("улица Айманова", "Ш.Айманова")).toBe(true);
    expect(matchesOsmName("улица Озёрная", "Озерная")).toBe(true);
  });

  it("rejects other streets that merely contain the name", () => {
    expect(matchesOsmName("проспект Ермека Серкебаева", "Гагарина")).toBe(false);
    expect(matchesOsmName("улица Абаева", "Абая")).toBe(false);
    expect(matchesOsmName("2-я улица Сатпаева", "Сатпаева")).toBe(false);
  });

  it("accepts a Russian type word after the name", () => {
    expect(matchesOsmName("Михайловская улица", "Михайловская")).toBe(true);
    expect(matchesOsmName("Садовая улица", "Садовая")).toBe(true);
  });

  it("folds Kazakh letters and Kazakh type words", () => {
    expect(matchesOsmName("Ер Төстік көшесі", "Ер Төстік")).toBe(true);
    expect(matchesOsmName("улица Ер Тостик", "Ер Төстік")).toBe(true);
    expect(matchesOsmName("Қалмаржын көшесі", "Қалмаржын")).toBe(true);
  });

  it("ignores case («Саке Батыра» / «улица Саке батыра»)", () => {
    expect(matchesOsmName("улица Саке батыра", "Саке Батыра")).toBe(true);
  });

  it("allows a given name in front, as OSM spells streets in full", () => {
    expect(matchesOsmName("улица Карла Маркса", "Маркса")).toBe(true);
    expect(matchesOsmName("улица Хаджи Мукана", "Мукана")).toBe(true);
    expect(matchesOsmName("улица 2-я Маркса", "Маркса")).toBe(false);
  });

  it("treats regex characters in names literally", () => {
    expect(matchesOsmName("улица 8 линия", "8 линия")).toBe(true);
    expect(matchesOsmName("улица Xa", "X.")).toBe(false);
  });
});

describe("mergeWays", () => {
  const a: LatLon = [43.1, 76.8];
  const b: LatLon = [43.1, 76.81];
  const c: LatLon = [43.1, 76.82];
  const d: LatLon = [43.1, 76.83];
  const far: LatLon[] = [
    [43.3, 77.0],
    [43.3, 77.01],
  ];

  it("joins ways that share end points, whichever way they point", () => {
    expect(
      mergeWays([
        [a, b],
        [c, b],
        [c, d],
      ]),
    ).toEqual([[a, b, c, d]]);
    expect(
      mergeWays([
        [c, d],
        [a, b],
        [b, c],
      ]),
    ).toEqual([[a, b, c, d]]);
  });

  it("keeps disconnected pieces apart", () => {
    expect(mergeWays([[a, b], far])).toEqual([[a, b], far]);
  });
});

describe("simplifyLine", () => {
  it("drops points that barely bend the line", () => {
    const line: LatLon[] = [
      [43.2, 76.8],
      [43.20001, 76.805], // ~1 m off the straight line
      [43.2, 76.81],
    ];
    expect(simplifyLine(line, 5)).toEqual([line[0], line[2]]);
  });

  it("keeps real corners", () => {
    const corner: LatLon[] = [
      [43.2, 76.8],
      [43.21, 76.8],
      [43.21, 76.81],
    ];
    expect(simplifyLine(corner, 5)).toEqual(corner);
  });
});

describe("prepareLines", () => {
  it("merges, simplifies and rounds to 5 decimals", () => {
    expect(
      prepareLines([
        [
          [43.1234567, 76.8],
          [43.1234567, 76.805],
        ],
        [
          [43.1234567, 76.805],
          [43.1234567, 76.81],
        ],
      ]),
    ).toEqual([
      [
        [43.12346, 76.8],
        [43.12346, 76.81],
      ],
    ]);
  });
});

describe("clipToViewbox", () => {
  it("keeps the part inside Almaty and splits where a line leaves it", () => {
    const line: LatLon[] = [
      [43.2, 76.8],
      [43.21, 76.8],
      [43.5, 76.8], // outside (north of the box)
      [43.22, 76.81],
      [43.23, 76.81],
    ];
    expect(clipToViewbox(line)).toEqual([
      [
        [43.2, 76.8],
        [43.21, 76.8],
      ],
      [
        [43.22, 76.81],
        [43.23, 76.81],
      ],
    ]);
  });
});

describe("overpassNamePattern", () => {
  const matches = (osmName: string, name: string) =>
    new RegExp(overpassNamePattern(name), "u").test(osmName);

  it("finds every spelling the exact check accepts", () => {
    expect(matches("Ер Төстік көшесі", "Ер Төстік")).toBe(true);
    expect(matches("улица Ер Тостик", "Ер Төстік")).toBe(true);
    expect(matches("улица Саке батыра", "Саке Батыра")).toBe(true);
    expect(matches("улица Озёрная", "Озерная")).toBe(true);
    expect(matches("улица Енлик Кебек", "Енлик-Кебек")).toBe(true);
    expect(matches("улица Айманова", "Ш.Айманова")).toBe(true);
  });

  it("is a plain bracket-class regex Overpass understands", () => {
    expect(overpassNamePattern("Абая")).toBe("[аәАӘ][бБ][аәАӘ][яЯ]");
    expect(overpassNamePattern("8 линия")).toBe("8[- ][лЛ][иіИІ][нңНҢ][иіИІ][яЯ]");
  });
});
