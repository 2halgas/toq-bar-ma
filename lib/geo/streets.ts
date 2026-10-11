import { z } from "zod";

import { normalizePlace } from "@/lib/azhk/normalize";
import { type ToponymKind } from "@/lib/azhk/toponyms";
import { ALMATY_VIEWBOX } from "@/lib/geo/geocache";

/**
 * Full street geometry from OpenStreetMap (via Overpass), cached in
 * data/streets.json. Used at build time only — to put an outage where its
 * streets actually meet instead of at an arbitrary piece of each street.
 */

/** [lat, lon], rounded to 5 decimals (~1 m). */
export type LatLon = [number, number];

/** Streets have a line; microdistricts and residential complexes don't. */
export const LINEAR_KINDS: ReadonlySet<ToponymKind> = new Set(["ул", "пр", "пер"]);

const LatLonSchema = z.tuple([
  z.number().min(ALMATY_VIEWBOX.south).max(ALMATY_VIEWBOX.north),
  z.number().min(ALMATY_VIEWBOX.west).max(ALMATY_VIEWBOX.east),
]);

export const StreetEntrySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("found"),
    /** OSM names that matched, e.g. ["проспект Гагарина"] — for auditing. */
    osmNames: z.array(z.string()).min(1),
    /** Connected pieces of the street, each simplified. */
    lines: z.array(z.array(LatLonSchema).min(2)).min(1),
    fetchedAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    status: z.literal("not_found"),
    fetchedAt: z.iso.datetime({ offset: true }),
  }),
]);

/** Keyed by toponym key, like the geocache ("ул сатпаева"). */
export const StreetsCacheSchema = z.record(z.string(), StreetEntrySchema);

export type StreetEntry = z.infer<typeof StreetEntrySchema>;
export type StreetsCache = z.infer<typeof StreetsCacheSchema>;

// --- Names ------------------------------------------------------------------

/**
 * Street-type words OSM puts around a name, after `normalizePlace` (lower case,
 * Kazakh letters folded, «улица» → «ул», «проспект» → «пр»): Russian before or
 * after it («улица Сатпаева», «Михайловская улица»), Kazakh after it («Ер Төстік көшесі»).
 */
const TYPE_WORDS = [
  "ул",
  "пр",
  "переулок",
  "бульвар",
  "проезд",
  "тупик",
  "шоссе",
  "кошеси",
  "дангылы",
  "туйыгы",
  "бульвары",
];
const LEADING_TYPE = new RegExp(`^(?:${TYPE_WORDS.join("|")}) `, "u");
const TRAILING_TYPE = new RegExp(` (?:${TYPE_WORDS.join("|")})$`, "u");

/**
 * The name as OSM would spell it: initials dropped («Ш.Айманова» → «Айманова»,
 * «Р. Зорге» → «Зорге»), spaces normalized. Returns "" if nothing usable is left.
 */
export function streetCoreName(name: string): string {
  return name
    .replace(/^(?:\p{Lu}\.\s*)+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Comparable form of any street name: normalized, type words stripped from either end. */
function comparableName(name: string): string {
  return normalizePlace(streetCoreName(name)).replace(LEADING_TYPE, "").replace(TRAILING_TYPE, "");
}

/**
 * Does an OSM `name` / `name:ru` belong to this street from the schedule?
 * Same name after normalization, or the same with a given name in front of it,
 * as OSM often spells streets in full («Маркса» → «улица Карла Маркса»).
 */
export function matchesOsmName(osmName: string, name: string): boolean {
  const osm = comparableName(osmName);
  const ours = comparableName(name);
  if (!ours) return false;
  if (osm === ours) return true;
  const extra = osm.slice(0, osm.length - ours.length);
  return osm.endsWith(` ${ours}`) && /^\p{L}+ $/u.test(extra);
}

/**
 * Every letter as a bracket class of its look-alikes in either case, so Overpass
 * finds «Төстік», «Тостик» and «ТОСТИК» alike. Matches anywhere in the name; the
 * exact check is `matchesOsmName`. Plain POSIX ERE, no flags needed.
 */
const LETTER_VARIANTS: Record<string, string> = {
  а: "аә",
  ә: "аә",
  г: "гғ",
  ғ: "гғ",
  е: "её",
  ё: "её",
  и: "иі",
  і: "иі",
  к: "кқ",
  қ: "кқ",
  н: "нң",
  ң: "нң",
  о: "оө",
  ө: "оө",
  у: "уұү",
  ұ: "уұү",
  ү: "уұү",
  х: "хһ",
  һ: "хһ",
};

export function overpassNamePattern(name: string): string {
  return [...streetCoreName(name).toLowerCase()]
    .map((char) => {
      if (/\p{L}/u.test(char)) {
        const variants = LETTER_VARIANTS[char] ?? char;
        return `[${variants}${variants.toUpperCase()}]`;
      }
      return /[\s-]/.test(char) ? "[- ]" : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
}

// --- Geometry -----------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Local equirectangular metres around Almaty: plenty accurate within a city. */
export function toMetres([lat, lon]: LatLon): [number, number] {
  return [
    toRadians(lon) * EARTH_RADIUS_M * Math.cos(toRadians(43.24)),
    toRadians(lat) * EARTH_RADIUS_M,
  ];
}

const samePoint = (a: LatLon, b: LatLon) => a[0] === b[0] && a[1] === b[1];

/**
 * OSM splits a street into many ways; joins those that share an end point into
 * longer lines (reversing as needed). Disconnected pieces stay separate.
 */
export function mergeWays(ways: readonly LatLon[][]): LatLon[][] {
  const pending = ways.filter((way) => way.length >= 2).map((way) => [...way]);
  const merged: LatLon[][] = [];

  while (pending.length > 0) {
    let line = pending.shift() ?? [];
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = 0; index < pending.length; index++) {
        const way = pending[index] ?? [];
        const first = line[0];
        const last = line.at(-1);
        const wayFirst = way[0];
        const wayLast = way.at(-1);
        if (!first || !last || !wayFirst || !wayLast) continue;

        if (samePoint(last, wayFirst)) line = [...line, ...way.slice(1)];
        else if (samePoint(last, wayLast)) line = [...line, ...way.slice(0, -1).reverse()];
        else if (samePoint(first, wayLast)) line = [...way.slice(0, -1), ...line];
        else if (samePoint(first, wayFirst)) line = [...way.slice(1).reverse(), ...line];
        else continue;

        pending.splice(index, 1);
        grew = true;
        break;
      }
    }
    merged.push(line);
  }
  return merged;
}

function distanceToSegmentM(point: LatLon, a: LatLon, b: LatLon): number {
  const [px, py] = toMetres(point);
  const [ax, ay] = toMetres(a);
  const [bx, by] = toMetres(b);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Douglas–Peucker: drops points closer than `toleranceM` to the simplified line. */
export function simplifyLine(line: readonly LatLon[], toleranceM: number): LatLon[] {
  if (line.length <= 2) return [...line];
  const first = line[0] as LatLon;
  const last = line.at(-1) as LatLon;

  let farthest = 0;
  let farthestIndex = 0;
  for (let index = 1; index < line.length - 1; index++) {
    const distance = distanceToSegmentM(line[index] as LatLon, first, last);
    if (distance > farthest) {
      farthest = distance;
      farthestIndex = index;
    }
  }
  if (farthest <= toleranceM) return [first, last];

  const left = simplifyLine(line.slice(0, farthestIndex + 1), toleranceM);
  const right = simplifyLine(line.slice(farthestIndex), toleranceM);
  return [...left.slice(0, -1), ...right];
}

export function roundPoint([lat, lon]: LatLon): LatLon {
  return [Number(lat.toFixed(5)), Number(lon.toFixed(5))];
}

function insideViewbox([lat, lon]: LatLon): boolean {
  const { west, south, east, north } = ALMATY_VIEWBOX;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

/** Splits a line where it leaves the city's box, keeping only the parts inside. */
export function clipToViewbox(line: readonly LatLon[]): LatLon[][] {
  const parts: LatLon[][] = [];
  let current: LatLon[] = [];
  for (const point of line) {
    if (insideViewbox(point)) {
      current.push(point);
    } else {
      if (current.length >= 2) parts.push(current);
      current = [];
    }
  }
  if (current.length >= 2) parts.push(current);
  return parts;
}

/** Ways from OSM → what goes into the cache: merged, clipped to the city, simplified to ~5 m, rounded. */
export function prepareLines(ways: readonly LatLon[][], toleranceM = 5): LatLon[][] {
  return mergeWays(ways)
    .flatMap(clipToViewbox)
    .map((line) => simplifyLine(line, toleranceM).map(roundPoint))
    .filter((line) => line.length >= 2);
}
