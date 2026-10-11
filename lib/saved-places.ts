import { matchesPlace, normalizePlace } from "@/lib/azhk/normalize";
import { type AzhkOutage } from "@/lib/azhk/schema";
import { MAX_QUERY_LENGTH } from "@/lib/search-params";

/**
 * "My places": streets someone checks regularly, kept in their browser's
 * localStorage only — never sent anywhere, and there is no server to send them to.
 */

export const SAVED_PLACES_STORAGE_KEY = "toq-bar-ma:places";
export const MAX_SAVED_PLACES = 5;

/** «м-н Айгерим-1», «Айгерим-1» and «айгерим 1» are one entry: normalized, type word dropped. */
function placeKey(place: string): string {
  return normalizePlace(place).replace(/^(?:мкр|ул|пр) /u, "");
}

function sameKey(a: string, b: string): boolean {
  return placeKey(a) === placeKey(b);
}

/** Whatever is in storage (or nothing, or garbage) → a clean list. */
export function parseSavedPlaces(raw: string | null): string[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];

  const places: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const place = item.trim().slice(0, MAX_QUERY_LENGTH);
    if (place && !places.some((saved) => sameKey(saved, place))) places.push(place);
    if (places.length === MAX_SAVED_PLACES) break;
  }
  return places;
}

export function isPlaceSaved(places: readonly string[], query: string): boolean {
  return places.some((place) => sameKey(place, query));
}

/** Adds to the end; ignored if already saved or the list is full. */
export function addPlace(places: readonly string[], query: string): string[] {
  const place = query.trim();
  if (!place || isPlaceSaved(places, place) || places.length >= MAX_SAVED_PLACES) {
    return [...places];
  }
  return [...places, place];
}

export function removePlace(places: readonly string[], query: string): string[] {
  return places.filter((place) => !sameKey(place, query));
}

/** Outages for a place from today to the end of the published schedule. */
export function countUpcoming(
  outages: readonly AzhkOutage[],
  place: string,
  today: string,
): number {
  return outages.filter(
    (outage) => outage.date >= today && matchesPlace(outage.placeNormalized, place),
  ).length;
}
