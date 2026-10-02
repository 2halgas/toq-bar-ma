import { type AzhkOutage } from "@/lib/azhk/schema";
import { extractToponyms } from "@/lib/azhk/toponyms";
import { type Geocache, type MapLocation } from "@/lib/geo/geocache";

/** An outage plus the keys of the places it mentions (see `extractToponyms`). */
export type OutageView = AzhkOutage & { toponymKeys: string[] };

/**
 * Server-side join of outages with the geocache: every outage gets its toponym
 * keys, and only toponyms that were actually found end up in `locations`.
 */
export function buildOutageViews(
  outages: readonly AzhkOutage[],
  geocache: Geocache,
): { outages: OutageView[]; locations: Record<string, MapLocation> } {
  const locations: Record<string, MapLocation> = {};

  const views = outages.map((outage) => {
    const toponyms = extractToponyms(outage.place);
    for (const toponym of toponyms) {
      const entry = geocache[toponym.key];
      if (entry?.status === "found" && !locations[toponym.key]) {
        locations[toponym.key] = { label: toponym.label, lat: entry.lat, lon: entry.lon };
      }
    }
    return { ...outage, toponymKeys: toponyms.map((toponym) => toponym.key) };
  });

  return { outages: views, locations };
}

export interface MapPoint extends MapLocation {
  key: string;
  outages: OutageView[];
}

/** One point per located toponym, with every outage that mentions it; busiest first. */
export function buildMapPoints(
  outages: readonly OutageView[],
  locations: Readonly<Record<string, MapLocation>>,
): MapPoint[] {
  const points = new Map<string, MapPoint>();

  for (const outage of outages) {
    for (const key of outage.toponymKeys) {
      const location = locations[key];
      if (!location) continue;
      const point = points.get(key) ?? { key, ...location, outages: [] };
      if (!point.outages.includes(outage)) point.outages.push(outage);
      points.set(key, point);
    }
  }

  return [...points.values()].sort(
    (a, b) => b.outages.length - a.outages.length || a.label.localeCompare(b.label, "ru"),
  );
}

/** Outages that have no point on the map at all — shown as a caveat under the map. */
export function countUnmapped(
  outages: readonly OutageView[],
  locations: Readonly<Record<string, MapLocation>>,
): number {
  return outages.filter((outage) => !outage.toponymKeys.some((key) => key in locations)).length;
}
