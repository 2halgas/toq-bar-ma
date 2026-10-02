import { describe, expect, it } from "vitest";

import { type Geocache } from "@/lib/geo/geocache";
import { buildMapPoints, buildOutageViews, countUnmapped } from "@/lib/map-points";
import { makeOutage } from "@/lib/test/factories";

const found = (lat: number, lon: number) => ({
  status: "found" as const,
  query: "q",
  lat,
  lon,
  osm: "way/1",
  geocodedAt: "2026-10-02T10:00:00.000Z",
});

const geocache: Geocache = {
  "мкр айгерим 1": found(43.27, 76.84),
  "ул азаттык": found(43.274, 76.85),
  "ул веницианова": { status: "not_found", queries: ["q"], geocodedAt: "2026-10-02T10:00:00.000Z" },
};

describe("buildOutageViews", () => {
  const { outages, locations } = buildOutageViews(
    [
      makeOutage({ id: "a", place: "м-н Айгерим-1, ул.Азаттык" }),
      makeOutage({ id: "b", place: "ул. Веницианова" }),
    ],
    geocache,
  );

  it("attaches toponym keys to every outage", () => {
    expect(outages.map((o) => o.toponymKeys)).toEqual([
      ["мкр айгерим 1", "ул азаттык"],
      ["ул веницианова"],
    ]);
  });

  it("keeps only toponyms that were found, with display labels", () => {
    expect(locations).toEqual({
      "мкр айгерим 1": { label: "мкр. Айгерим-1", lat: 43.27, lon: 76.84 },
      "ул азаттык": { label: "ул. Азаттык", lat: 43.274, lon: 76.85 },
    });
  });
});

describe("buildMapPoints", () => {
  const { outages, locations } = buildOutageViews(
    [
      makeOutage({ id: "a", place: "м-н Айгерим-1, ул.Азаттык" }),
      makeOutage({ id: "b", place: "мкр. Айгерим-1, д.5" }),
      makeOutage({ id: "c", place: "ул. Веницианова" }),
    ],
    geocache,
  );

  it("groups outages by located toponym, busiest first", () => {
    expect(
      buildMapPoints(outages, locations).map((p) => [p.label, p.outages.map((o) => o.id)]),
    ).toEqual([
      ["мкр. Айгерим-1", ["a", "b"]],
      ["ул. Азаттык", ["a"]],
    ]);
  });

  it("counts outages that can't be shown on the map", () => {
    expect(countUnmapped(outages, locations)).toBe(1);
  });

  it("returns nothing for no outages", () => {
    expect(buildMapPoints([], locations)).toEqual([]);
  });
});
