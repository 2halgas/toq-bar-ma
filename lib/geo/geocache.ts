import { z } from "zod";

/**
 * Bounding box of Almaty's eight districts (from their OSM boundaries). Nominatim
 * is asked to search only inside it, which keeps same-named streets in
 * neighbouring towns (Талгар, Каскелен, Боралдай) off the map.
 */
export const ALMATY_VIEWBOX = { west: 76.73, south: 43.03, east: 77.17, north: 43.41 } as const;

export const GeocacheEntrySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("found"),
    /** The query that produced the hit, for auditing. */
    query: z.string(),
    lat: z.number().min(ALMATY_VIEWBOX.south).max(ALMATY_VIEWBOX.north),
    lon: z.number().min(ALMATY_VIEWBOX.west).max(ALMATY_VIEWBOX.east),
    /** OSM object, e.g. "way/123456" — lets a wrong match be traced and fixed. */
    osm: z.string(),
    geocodedAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    status: z.literal("not_found"),
    /** Every query that was tried. */
    queries: z.array(z.string()),
    geocodedAt: z.iso.datetime({ offset: true }),
  }),
]);

/** Keyed by toponym key (`extractToponyms(...).key`, e.g. "мкр айгерим 1"). */
export const GeocacheSchema = z.record(z.string(), GeocacheEntrySchema);

export type GeocacheEntry = z.infer<typeof GeocacheEntrySchema>;
export type Geocache = z.infer<typeof GeocacheSchema>;

export interface MapLocation {
  label: string;
  lat: number;
  lon: number;
}
