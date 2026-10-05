/**
 * Geocodes the streets and microdistricts mentioned in data/outages.json with
 * OpenStreetMap Nominatim and caches the results in data/geocache.json.
 *
 *   pnpm data:geocode                     # only toponyms not in the cache yet
 *   pnpm data:geocode --limit 20          # at most 20 new lookups (for testing)
 *   pnpm data:geocode --retry-not-found   # also retry previous misses
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * max 1 request/second, an identifying User-Agent (set GEOCODER_CONTACT to an email
 * or URL), and results are cached — anything already in the cache, including
 * "not found", is never requested again unless explicitly retried.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { AzhkOutagesFileSchema } from "@/lib/azhk/schema";
import { extractToponyms, type Toponym, type ToponymKind } from "@/lib/azhk/toponyms";
import { z } from "zod";

import {
  ALMATY_VIEWBOX,
  GeocacheEntrySchema,
  type Geocache,
  type GeocacheEntry,
} from "@/lib/geo/geocache";
import { siteConfig } from "@/lib/site";

const OUTAGES_PATH = "data/outages.json";
const CACHE_PATH = "data/geocache.json";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_INTERVAL_MS = 1_100;
const CITY_SUFFIX = "Алматы, Казахстан";

const contact = process.env.GEOCODER_CONTACT;
const USER_AGENT = `toq-bar-ma/0.1 (Almaty planned outages map; ${contact || siteConfig.githubUrl})`;

const TYPE_WORDS: Record<ToponymKind, string> = {
  мкр: "микрорайон",
  ул: "улица",
  пр: "проспект",
  пер: "переулок",
  жк: "жилой комплекс",
};

/** Most specific first; the bare name catches streets OSM lists under a different type. */
function queriesFor(toponym: Toponym): string[] {
  return [
    `${TYPE_WORDS[toponym.kind]} ${toponym.name}, ${CITY_SUFFIX}`,
    `${toponym.name}, ${CITY_SUFFIX}`,
  ];
}

let lastRequestAt = 0;

interface NominatimHit {
  lat: string;
  lon: string;
  osm_type: string;
  osm_id: number;
}

async function search(query: string): Promise<NominatimHit | undefined> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((done) => setTimeout(done, wait));
  lastRequestAt = Date.now();

  const { west, south, east, north } = ALMATY_VIEWBOX;
  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "kz",
    "accept-language": "ru",
    viewbox: `${west},${north},${east},${south}`,
    bounded: "1",
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 429) throw new Error("Nominatim rate limit hit (HTTP 429) — stopping.");
  if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);
  const hits = (await response.json()) as NominatimHit[];
  return hits[0];
}

async function geocode(toponym: Toponym): Promise<GeocacheEntry> {
  const queries = queriesFor(toponym);
  const geocodedAt = new Date().toISOString();
  for (const query of queries) {
    const hit = await search(query);
    if (hit) {
      return {
        status: "found",
        query,
        lat: Number(Number(hit.lat).toFixed(6)),
        lon: Number(Number(hit.lon).toFixed(6)),
        osm: `${hit.osm_type}/${hit.osm_id}`,
        geocodedAt,
      };
    }
  }
  return { status: "not_found", queries, geocodedAt };
}

/**
 * Entries that no longer pass the schema (e.g. a point outside a tightened
 * viewbox) are dropped, so they get looked up again instead of breaking the build.
 */
function readCache(path: string): Geocache {
  if (!existsSync(path)) return {};
  const raw = z.record(z.string(), z.unknown()).parse(JSON.parse(readFileSync(path, "utf8")));
  const cache: Geocache = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const entry = GeocacheEntrySchema.safeParse(value);
    if (entry.success) cache[key] = entry.data;
    else dropped.push(key);
  }
  if (dropped.length > 0) {
    console.warn(
      `Dropped ${dropped.length} invalid cache entries (will retry): ${dropped.join(", ")}`,
    );
  }
  return cache;
}

/** Sorted keys keep diffs small when the weekly job commits the cache. */
function writeCache(path: string, cache: Geocache): void {
  const sorted = Object.fromEntries(
    Object.entries(cache).sort(([a], [b]) => a.localeCompare(b, "ru")),
  );
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: "string" },
      "retry-not-found": { type: "boolean", default: false },
    },
  });
  const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;

  const outages = AzhkOutagesFileSchema.parse(
    JSON.parse(readFileSync(resolve(process.cwd(), OUTAGES_PATH), "utf8")),
  ).outages;
  const toponyms = new Map<string, Toponym>();
  for (const outage of outages) {
    for (const toponym of extractToponyms(outage.place)) toponyms.set(toponym.key, toponym);
  }

  const cachePath = resolve(process.cwd(), CACHE_PATH);
  const cache = readCache(cachePath);
  const pending = [...toponyms.values()].filter((toponym) => {
    const cached = cache[toponym.key];
    return !cached || (values["retry-not-found"] && cached.status === "not_found");
  });
  const batch = pending.slice(0, limit);
  console.log(
    `${toponyms.size} toponyms, ${toponyms.size - pending.length} cached, ${batch.length} to look up` +
      (batch.length
        ? ` (~${Math.ceil((batch.length * 1.5 * MIN_REQUEST_INTERVAL_MS) / 60_000)} min)`
        : ""),
  );

  let found = 0;
  for (const [index, toponym] of batch.entries()) {
    const entry = await geocode(toponym);
    cache[toponym.key] = entry;
    writeCache(cachePath, cache); // after every lookup, so an interrupted run loses nothing
    if (entry.status === "found") found += 1;
    console.log(
      `[${index + 1}/${batch.length}] ${entry.status === "found" ? "✓" : "✗"} ${toponym.label}`,
    );
  }

  const total = [...toponyms.keys()].filter((key) => cache[key]?.status === "found").length;
  console.log(
    `Done: ${found}/${batch.length} new found. On the map: ${total}/${toponyms.size} toponyms of the current schedule.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
