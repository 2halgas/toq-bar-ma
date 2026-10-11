import { describe, expect, it } from "vitest";

import {
  addPlace,
  countUpcoming,
  isPlaceSaved,
  MAX_SAVED_PLACES,
  parseSavedPlaces,
  removePlace,
} from "@/lib/saved-places";
import { makeOutage } from "@/lib/test/factories";

describe("parseSavedPlaces", () => {
  it("reads a JSON list of places", () => {
    expect(parseSavedPlaces('["Айгерим-1","Ратушного"]')).toEqual(["Айгерим-1", "Ратушного"]);
  });

  it("survives missing or broken storage", () => {
    expect(parseSavedPlaces(null)).toEqual([]);
    expect(parseSavedPlaces("not json")).toEqual([]);
    expect(parseSavedPlaces('{"a":1}')).toEqual([]);
  });

  it("drops junk, duplicates and anything past the limit", () => {
    expect(parseSavedPlaces('["Айгерим-1", 42, "", "  айгерим 1 ", "Ратушного"]')).toEqual([
      "Айгерим-1",
      "Ратушного",
    ]);
    const many = JSON.stringify(Array.from({ length: 10 }, (_, i) => `Улица ${i}`));
    expect(parseSavedPlaces(many)).toHaveLength(MAX_SAVED_PLACES);
  });
});

describe("addPlace / removePlace", () => {
  it("adds once, treating spelling variants as the same place", () => {
    const places = addPlace(["Айгерим-1"], "Ратушного");
    expect(places).toEqual(["Айгерим-1", "Ратушного"]);
    expect(addPlace(places, "м-н айгерим 1")).toEqual(places);
    expect(isPlaceSaved(places, "мкр. Айгерим-1")).toBe(true);
  });

  it("stops at the limit and ignores empty queries", () => {
    const full = Array.from({ length: MAX_SAVED_PLACES }, (_, i) => `Улица ${i}`);
    expect(addPlace(full, "Ещё одна")).toEqual(full);
    expect(addPlace([], "  ")).toEqual([]);
  });

  it("removes by the same normalized form", () => {
    expect(removePlace(["Айгерим-1", "Ратушного"], "айгерим 1")).toEqual(["Ратушного"]);
  });
});

describe("countUpcoming", () => {
  const outages = [
    makeOutage({ id: "a", date: "2026-10-12", place: "м-н Айгерим-1, ул. МТФ" }),
    makeOutage({ id: "b", date: "2026-10-14", place: "мкр. Айгерим-1 ул. Аксайская" }),
    makeOutage({ id: "c", date: "2026-10-14", place: "ул. Ратушного" }),
  ];

  it("counts only today and later", () => {
    expect(countUpcoming(outages, "Айгерим-1", "2026-10-13")).toBe(1);
    expect(countUpcoming(outages, "Айгерим-1", "2026-10-12")).toBe(2);
    expect(countUpcoming(outages, "Ратушного", "2026-10-15")).toBe(0);
  });
});
