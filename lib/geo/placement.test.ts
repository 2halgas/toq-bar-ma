import { describe, expect, it } from "vitest";

import { extractToponyms } from "@/lib/azhk/toponyms";
import { type Geocache } from "@/lib/geo/geocache";
import { placeOutage } from "@/lib/geo/placement";
import { type LatLon, type StreetEntry, type StreetsCache } from "@/lib/geo/streets";

// A small grid around Almaty's centre: ~0.0009° lat ≈ 100 m, ~0.0012° lon ≈ 100 m.
const LAT = 43.24;
const LON = 76.9;
const north = (metres: number) => LAT + metres / 111_195;
const east = (metres: number) => LON + metres / 80_980;

const street = (...lines: LatLon[][]): StreetEntry => ({
  status: "found",
  osmNames: ["x"],
  lines,
  fetchedAt: "2026-10-12T00:00:00.000Z",
});
/** West–east street at `y` metres north, from x0 to x1 metres east. */
const horizontal = (y: number, x0 = -1000, x1 = 1000) =>
  street([
    [north(y), east(x0)],
    [north(y), east(x1)],
  ]);
/** South–north street at `x` metres east. */
const vertical = (x: number, y0 = -1000, y1 = 1000) =>
  street([
    [north(y0), east(x)],
    [north(y1), east(x)],
  ]);

const found = (lat: number, lon: number) => ({
  status: "found" as const,
  query: "q",
  lat,
  lon,
  osm: "way/1",
  geocodedAt: "2026-10-12T00:00:00.000Z",
});

const STREETS: StreetsCache = {
  "ул сатпаева": horizontal(150),
  "ул мынбаева": horizontal(-150),
  "ул айманова": vertical(-200),
  "ул гагарина": vertical(200),
  "ул далекая": horizontal(9000, 5000, 7000), // far north-east
};

const place = (text: string, geocache: Geocache = {}) =>
  placeOutage(extractToponyms(text), STREETS, geocache);

describe("placeOutage", () => {
  it("turns four streets around a block into one area in its middle", () => {
    const [area, ...rest] = place("Сатпаева, Айманова, Мынбаева, Гагарина");
    expect(rest).toEqual([]);
    expect(area?.key).toBe("area:ул айманова|ул гагарина|ул мынбаева|ул сатпаева");
    expect(area?.label).toBe("Сатпаева · Айманова · Мынбаева · Гагарина");
    expect(area?.query).toBe("Сатпаева");
    expect(area?.lat).toBeCloseTo(LAT, 3);
    expect(area?.lon).toBeCloseTo(LON, 3);
    // The rectangle spans the block (300 × 400 m) plus a small margin.
    const [[south, west], [northEdge, eastEdge]] = area?.bounds ?? [
      [0, 0],
      [0, 0],
    ];
    expect(south).toBeLessThan(north(-150));
    expect(northEdge).toBeGreaterThan(north(150));
    expect(west).toBeLessThan(east(-200));
    expect(eastEdge).toBeGreaterThan(east(200));
  });

  it("puts two crossing streets at the crossing, without a rectangle", () => {
    const [area] = place("Сатпаева, Гагарина");
    expect(area?.lat).toBeCloseTo(north(150), 4);
    expect(area?.lon).toBeCloseTo(east(200), 4);
    expect(area?.bounds).toBeUndefined();
  });

  it("leaves out a namesake street far from the rest of the outage", () => {
    const placements = place("Сатпаева, Гагарина, Далекая");
    expect(placements.map((placement) => placement.label)).toEqual(["Сатпаева · Гагарина"]);
  });

  it("puts a lone street in its middle, not at its first point", () => {
    const [point] = place("ул. Гагарина");
    expect(point?.lat).toBeCloseTo(LAT, 4);
    expect(point?.lon).toBeCloseTo(east(200), 4);
    expect(point?.key.startsWith("ул гагарина@")).toBe(true);
  });

  it("keeps geocoded points for microdistricts and streets without geometry", () => {
    const geocache: Geocache = {
      "мкр самал 2": found(north(100), east(0)),
      "ул неизвестная": found(north(-300), east(50)),
    };
    const placements = place("мкр. Самал-2, ул. Неизвестная", geocache);
    expect(placements.map((placement) => placement.key)).toEqual(["мкр самал 2", "ул неизвестная"]);
  });

  it("uses a microdistrict to pick where on a street the outage is", () => {
    const geocache: Geocache = { "мкр самал 2": found(north(400), east(200)) };
    const placements = place("мкр. Самал-2, ул. Гагарина", geocache);
    const street = placements.find((placement) => placement.label === "ул. Гагарина");
    expect(street?.lat).toBeCloseTo(north(400), 4); // next to the microdistrict, not the middle
  });
});
