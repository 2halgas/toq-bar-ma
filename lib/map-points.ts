import { matchesPlace } from "@/lib/azhk/normalize";
import { type AzhkOutage } from "@/lib/azhk/schema";
import { extractToponyms } from "@/lib/azhk/toponyms";
import { type Geocache, type MapLocation } from "@/lib/geo/geocache";
import { placeOutage } from "@/lib/geo/placement";
import { type StreetsCache } from "@/lib/geo/streets";

/**
 * An outage plus the keys of the places it mentions (see `extractToponyms`) and
 * of where it is drawn on the map (see `placeOutage`).
 */
export type OutageView = AzhkOutage & { toponymKeys: string[]; locationKeys: string[] };

/**
 * Server-side join of outages with the geocache and street geometry: every
 * outage gets its toponym keys and map locations — an area where its streets
 * meet, or points — and only places that could be located end up in `locations`.
 * `placeNames` maps every toponym key to its name as written, for "did you mean".
 */
export function buildOutageViews(
  outages: readonly AzhkOutage[],
  geocache: Geocache,
  streets: StreetsCache = {},
): {
  outages: OutageView[];
  locations: Record<string, MapLocation>;
  placeNames: Record<string, string>;
} {
  const locations: Record<string, MapLocation> = {};
  const placeNames: Record<string, string> = {};

  // "Show in list" for an area searches by its rarest street, which usually finds
  // just that outage rather than everything on a long street like Сатпаева.
  const matchCounts = new Map<string, number>();
  const countMatches = (query: string) => {
    let count = matchCounts.get(query);
    if (count === undefined) {
      count = outages.filter((outage) => matchesPlace(outage.placeNormalized, query)).length;
      matchCounts.set(query, count);
    }
    return count;
  };
  const mostSpecific = (candidates: readonly string[]) =>
    candidates.reduce((best, query) => (countMatches(query) < countMatches(best) ? query : best));

  const views = outages.map((outage) => {
    const toponyms = extractToponyms(outage.place);
    for (const toponym of toponyms) placeNames[toponym.key] ??= toponym.name;

    const placements = placeOutage(toponyms, streets, geocache);
    for (const { key, queryCandidates, ...location } of placements) {
      locations[key] ??= queryCandidates?.length
        ? { ...location, query: mostSpecific(queryCandidates) }
        : location;
    }
    return {
      ...outage,
      toponymKeys: toponyms.map((toponym) => toponym.key),
      locationKeys: [...new Set(placements.map((placement) => placement.key))],
    };
  });

  return { outages: views, locations, placeNames };
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
    for (const key of outage.locationKeys) {
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
  return outages.filter((outage) => !outage.locationKeys.some((key) => key in locations)).length;
}
