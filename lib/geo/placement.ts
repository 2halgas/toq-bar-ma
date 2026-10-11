import { type Toponym } from "@/lib/azhk/toponyms";
import { type Geocache, type MapLocation } from "@/lib/geo/geocache";
import { LINEAR_KINDS, toMetres, type LatLon, type StreetsCache } from "@/lib/geo/streets";

/**
 * Where to put an outage on the map, from the full geometry of its streets.
 *
 * «Сатпаева, Айманова, Мынбаева, Гагарина» is one city block — two parallel
 * streets each way — not four points along four streets. When an outage's
 * streets meet, it becomes one area: a marker where they come closest together
 * and a rectangle over the nearby stretches of each street. Streets that don't
 * meet the others get a point on their stretch nearest the area; a lone street
 * gets the middle of its stretch instead of wherever its first OSM piece starts.
 */

/** An area holds together if every street passes within this distance of its centre. */
export const MAX_AREA_SPREAD_M = 700;
/**
 * A street further than this from the outage's area or microdistrict is a
 * same-named street elsewhere in the city (the real one is missing from OSM):
 * it is left off the map rather than shown in the wrong district.
 */
const MAX_REFERENCE_DISTANCE_M = 3_000;
/** Below this size a rectangle is just a line or a dot; the marker says it all. */
const MIN_RECTANGLE_SIDE_M = 40;
/** Rectangles get a little margin so the streets on its edges sit inside it. */
const RECTANGLE_MARGIN_M = 25;
const CENTRE_REFINEMENT_ROUNDS = 4;

export interface Placement extends MapLocation {
  /** Stable id: same streets (or same spot) → same key, so outages share a marker. */
  key: string;
  /** Search text for "show in list", e.g. the first street's name. */
  query: string;
  /** For areas: every street name, so the caller can pick the most specific search. */
  queryCandidates?: string[];
  /** [south-west, north-east] of an area, if it is big enough to draw. */
  bounds?: [LatLon, LatLon];
}

// --- Geometry in local metres ---------------------------------------------------

type Xy = [number, number];
type Segment = [Xy, Xy];

const EARTH_RADIUS_M = 6_371_000;
const COS_LATITUDE = Math.cos((43.24 * Math.PI) / 180);

function fromMetres([x, y]: Xy): LatLon {
  const lat = (y / EARTH_RADIUS_M) * (180 / Math.PI);
  const lon = (x / (EARTH_RADIUS_M * COS_LATITUDE)) * (180 / Math.PI);
  return [Number(lat.toFixed(5)), Number(lon.toFixed(5))];
}

interface StreetShape {
  toponym: Toponym;
  /** Connected pieces, each a list of segments in metres. */
  pieces: Segment[][];
}

function toShape(toponym: Toponym, lines: LatLon[][]): StreetShape {
  return {
    toponym,
    pieces: lines.map((line) => {
      const points = line.map(toMetres);
      return points.slice(1).map((point, index) => [points[index] as Xy, point] as Segment);
    }),
  };
}

function nearestOnSegment([px, py]: Xy, [[ax, ay], [bx, by]]: Segment): Xy {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return [ax + t * dx, ay + t * dy];
}

const distance = (a: Xy, b: Xy) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Closest point of a street (any piece) to `point`. */
function nearestOnStreet(point: Xy, segments: readonly Segment[]): { point: Xy; distance: number } {
  let best = { point: point, distance: Number.POSITIVE_INFINITY };
  for (const segment of segments) {
    const candidate = nearestOnSegment(point, segment);
    const d = distance(point, candidate);
    if (d < best.distance) best = { point: candidate, distance: d };
  }
  return best;
}

function segmentIntersection([a, b]: Segment, [c, d]: Segment): Xy | undefined {
  const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (denominator === 0) return undefined;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / denominator;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return undefined;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

function lengthOf(segments: readonly Segment[]): number {
  return segments.reduce((sum, [a, b]) => sum + distance(a, b), 0);
}

/** The point halfway along a piece, measured along the street. */
function middleOf(segments: readonly Segment[]): Xy {
  let remaining = lengthOf(segments) / 2;
  for (const [a, b] of segments) {
    const length = distance(a, b);
    if (remaining <= length) {
      const t = length === 0 ? 0 : remaining / length;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    }
    remaining -= length;
  }
  return segments.at(-1)?.[1] ?? [0, 0];
}

// --- Areas ---------------------------------------------------------------------

interface Area {
  centre: Xy;
  /** Farthest distance from the centre to any of the streets. */
  spread: number;
  /** Each street's point nearest the centre. */
  touches: Xy[];
}

function evaluate(centre: Xy, streets: readonly StreetShape[]): Area {
  const nearest = streets.map((street) => nearestOnStreet(centre, street.pieces.flat()));
  return {
    centre,
    spread: Math.max(...nearest.map((hit) => hit.distance)),
    touches: nearest.map((hit) => hit.point),
  };
}

/**
 * The spot the streets come closest to together (minimax): tried at every
 * vertex and every crossing between two of the streets, then pulled to the
 * middle of where the streets touch — inside the block, not on one of its sides.
 */
function findArea(streets: readonly StreetShape[]): Area {
  const candidates: Xy[] = streets.flatMap((street) =>
    street.pieces.flat().flatMap(([a, b]) => [a, b]),
  );
  for (let i = 0; i < streets.length; i++) {
    for (let j = i + 1; j < streets.length; j++) {
      for (const s1 of streets[i]?.pieces.flat() ?? []) {
        for (const s2 of streets[j]?.pieces.flat() ?? []) {
          const crossing = segmentIntersection(s1, s2);
          if (crossing) candidates.push(crossing);
        }
      }
    }
  }

  let best = evaluate(candidates[0] ?? [0, 0], streets);
  for (const candidate of candidates.slice(1)) {
    const area = evaluate(candidate, streets);
    if (area.spread < best.spread) best = area;
  }

  for (let round = 0; round < CENTRE_REFINEMENT_ROUNDS; round++) {
    const xs = best.touches.map(([x]) => x);
    const ys = best.touches.map(([, y]) => y);
    const middle: Xy = [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];
    const refined = evaluate(middle, streets);
    if (refined.spread > best.spread) break;
    best = refined;
  }
  return best;
}

function rectangleOf(touches: readonly Xy[]): [LatLon, LatLon] | undefined {
  const xs = touches.map(([x]) => x);
  const ys = touches.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (width < MIN_RECTANGLE_SIDE_M || height < MIN_RECTANGLE_SIDE_M) return undefined;
  return [
    fromMetres([Math.min(...xs) - RECTANGLE_MARGIN_M, Math.min(...ys) - RECTANGLE_MARGIN_M]),
    fromMetres([Math.max(...xs) + RECTANGLE_MARGIN_M, Math.max(...ys) + RECTANGLE_MARGIN_M]),
  ];
}

// --- Placing one outage -----------------------------------------------------------

function pointPlacement(key: string, toponym: Toponym, at: Xy): Placement {
  const [lat, lon] = fromMetres(at);
  return { key: `${key}@${lat},${lon}`, label: toponym.label, query: toponym.name, lat, lon };
}

/**
 * Placements for one outage's toponyms. Streets need an entry in `streets`;
 * everything else (microdistricts, streets OSM doesn't have) falls back to the
 * geocoded point, exactly as before.
 */
export function placeOutage(
  toponyms: readonly Toponym[],
  streets: StreetsCache,
  geocache: Geocache,
): Placement[] {
  const placements: Placement[] = [];
  const shapes: StreetShape[] = [];
  const fallback: Toponym[] = [];

  for (const toponym of toponyms) {
    const entry = streets[toponym.key];
    if (LINEAR_KINDS.has(toponym.kind) && entry?.status === "found") {
      shapes.push(toShape(toponym, entry.lines));
    } else {
      fallback.push(toponym);
    }
  }

  // Geocoded points: microdistricts also tell which same-named street is meant.
  const anchors: Xy[] = [];
  for (const toponym of fallback) {
    const entry = geocache[toponym.key];
    if (entry?.status !== "found") continue;
    placements.push({
      key: toponym.key,
      label: toponym.label,
      query: toponym.name,
      lat: entry.lat,
      lon: entry.lon,
    });
    anchors.push(toMetres([entry.lat, entry.lon]));
  }

  // The largest group of streets that meet: drop the farthest one until they do.
  let group = [...shapes];
  let area: Area | undefined;
  while (group.length >= 2) {
    const candidate = findArea(group);
    if (candidate.spread <= MAX_AREA_SPREAD_M) {
      area = candidate;
      break;
    }
    const farthest = group.reduce((worst, street) =>
      nearestOnStreet(candidate.centre, street.pieces.flat()).distance >
      nearestOnStreet(candidate.centre, worst.pieces.flat()).distance
        ? street
        : worst,
    );
    group = group.filter((street) => street !== farthest);
  }

  if (area) {
    const [lat, lon] = fromMetres(area.centre);
    const names = group.map((street) => street.toponym.name);
    placements.push({
      key: `area:${group
        .map((street) => street.toponym.key)
        .sort()
        .join("|")}`,
      label: names.join(" · "),
      query: names[0] ?? "",
      queryCandidates: names,
      lat,
      lon,
      bounds: rectangleOf(area.touches),
    });
    anchors.unshift(area.centre);
  }

  const inArea = new Set(area ? group : []);
  for (const street of shapes) {
    if (inArea.has(street)) continue;
    const segments = street.pieces.flat();
    const reference = anchors
      .map((anchor) => nearestOnStreet(anchor, segments))
      .find((hit) => hit.distance <= MAX_REFERENCE_DISTANCE_M);
    if (reference) {
      placements.push(pointPlacement(street.toponym.key, street.toponym, reference.point));
      continue;
    }
    if (anchors.length > 0) continue; // far from everything else in this outage: wrong namesake
    // Alone: the middle of the piece the geocoder pointed at (it knows the right
    // district when a name repeats), or of the longest piece.
    const geocoded = geocache[street.toponym.key];
    const hint = geocoded?.status === "found" ? toMetres([geocoded.lat, geocoded.lon]) : undefined;
    const piece = hint
      ? street.pieces.reduce((best, piece) =>
          nearestOnStreet(hint, piece).distance < nearestOnStreet(hint, best).distance
            ? piece
            : best,
        )
      : street.pieces.reduce((best, piece) => (lengthOf(piece) > lengthOf(best) ? piece : best));
    placements.push(pointPlacement(street.toponym.key, street.toponym, middleOf(piece)));
  }

  return placements;
}
