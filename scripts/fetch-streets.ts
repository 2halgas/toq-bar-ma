/**
 * Downloads the full geometry of every street named in data/outages.json from
 * OpenStreetMap (Overpass API) and caches it in data/streets.json, so outages
 * can later be placed where their streets meet.
 *
 *   pnpm data:streets                     # only streets not in the cache yet
 *   pnpm data:streets --limit 20          # at most 20 new streets (for testing)
 *   pnpm data:streets --retry-not-found   # also retry previous misses
 *
 * Entries fetched with an older STREET_MATCHER_VERSION are always fetched again.
 *
 * Overpass usage policy (https://dev.overpass-api.de/overpass-doc/en/preface/commons.html):
 * one query at a time, an identifying User-Agent, results cached. Streets rarely
 * change, so anything cached — including "not found" — is never requested again
 * unless retried. Public Overpass servers are often busy: each batch is tried on
 * several of them with backoff, and an interrupted run keeps what it fetched.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { AzhkOutagesFileSchema } from "@/lib/azhk/schema";
import { extractToponyms, type Toponym } from "@/lib/azhk/toponyms";
import { ALMATY_VIEWBOX } from "@/lib/geo/geocache";
import {
  LINEAR_KINDS,
  matchesOsmName,
  overpassNamePattern,
  prepareLines,
  STREET_MATCHER_VERSION,
  StreetEntrySchema,
  streetCoreName,
  type LatLon,
  type StreetEntry,
  type StreetsCache,
} from "@/lib/geo/streets";
import { siteConfig } from "@/lib/site";

const OUTAGES_PATH = "data/outages.json";
const CACHE_PATH = "data/streets.json";

/** Tried in order; whichever answers moves to the front for the next batches. */
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
/** Streets per query: one regex alternation, so a batch costs a single request. */
const BATCH_SIZE = 20;
const PAUSE_BETWEEN_BATCHES_MS = 10_000;
const RETRY_DELAYS_MS = [15_000, 60_000];
const REQUEST_TIMEOUT_MS = 150_000;

const contact = process.env.GEOCODER_CONTACT;
const USER_AGENT = `toq-bar-ma/0.1 (Almaty planned outages map; ${contact || siteConfig.githubUrl})`;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

interface OverpassWay {
  type: "way";
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

/** Overpass QL string literal: backslashes and quotes escaped. */
function qlString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildQuery(toponyms: readonly Toponym[]): string {
  // A loose, unanchored match per street, OR-ed together; `matchesOsmName` then
  // keeps only real matches, so a short name pulling in a few extra ways is fine.
  const regex = toponyms.map((toponym) => overpassNamePattern(toponym.name)).join("|");
  const { west, south, east, north } = ALMATY_VIEWBOX;
  const bbox = `${south},${west},${north},${east}`;
  return [
    "[out:json][timeout:120];",
    "(",
    `  way["highway"]["name"~${qlString(regex)}](${bbox});`,
    `  way["highway"]["name:ru"~${qlString(regex)}](${bbox});`,
    ");",
    "out tags geom;",
  ].join("\n");
}

async function runQuery(query: string): Promise<OverpassWay[]> {
  const attempts = [...overpassEndpoints].flatMap((endpoint) =>
    [0, ...RETRY_DELAYS_MS].map((delay) => ({ endpoint, delay })),
  );
  let lastError = "";
  for (const { endpoint, delay } of attempts) {
    if (delay) await sleep(delay);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const text = await response.text();
      if (!response.ok || !text.startsWith("{")) {
        lastError = `${new URL(endpoint).host} responded ${response.status}`;
      } else {
        const data = JSON.parse(text) as { elements?: OverpassWay[]; remark?: string };
        // A timed-out query still returns 200, with a remark instead of all results.
        if (data.remark?.includes("timed out"))
          lastError = `${new URL(endpoint).host}: ${data.remark}`;
        else {
          overpassEndpoints.splice(overpassEndpoints.indexOf(endpoint), 1);
          overpassEndpoints.unshift(endpoint);
          return (data.elements ?? []).filter((element) => element.type === "way");
        }
      }
    } catch (error) {
      lastError = `${new URL(endpoint).host}: ${error instanceof Error ? error.message : String(error)}`;
    }
    console.warn(`  ${lastError}`);
  }
  throw new Error(`All Overpass servers failed (last: ${lastError})`);
}

function entryFor(toponym: Toponym, ways: readonly OverpassWay[], fetchedAt: string): StreetEntry {
  const osmNames = new Set<string>();
  const geometries: LatLon[][] = [];
  for (const way of ways) {
    const names = [way.tags?.name, way.tags?.["name:ru"]].filter((name) => name !== undefined);
    const matched = names.find((name) => matchesOsmName(name, toponym.name));
    if (!matched || !way.geometry) continue;
    osmNames.add(matched);
    geometries.push(way.geometry.map(({ lat, lon }) => [lat, lon] as LatLon));
  }
  const lines = prepareLines(geometries);
  const matcher = STREET_MATCHER_VERSION;
  return lines.length > 0
    ? { status: "found", matcher, osmNames: [...osmNames].sort(), lines, fetchedAt }
    : { status: "not_found", matcher, fetchedAt };
}

/** Entries that no longer pass the schema are dropped and fetched again. */
function readCache(path: string): StreetsCache {
  if (!existsSync(path)) return {};
  const raw = z.record(z.string(), z.unknown()).parse(JSON.parse(readFileSync(path, "utf8")));
  const cache: StreetsCache = {};
  for (const [key, value] of Object.entries(raw)) {
    const entry = StreetEntrySchema.safeParse(value);
    if (entry.success) cache[key] = entry.data;
  }
  return cache;
}

/** Sorted keys, one street per line: small diffs, and the file stays readable. */
function writeCache(path: string, cache: StreetsCache): void {
  const lines = Object.entries(cache)
    .sort(([a], [b]) => a.localeCompare(b, "ru"))
    .map(([key, entry]) => `  ${JSON.stringify(key)}: ${JSON.stringify(entry)}`);
  writeFileSync(path, `{\n${lines.join(",\n")}\n}\n`);
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
  const streets = new Map<string, Toponym>();
  for (const outage of outages) {
    for (const toponym of extractToponyms(outage.place)) {
      if (LINEAR_KINDS.has(toponym.kind) && streetCoreName(toponym.name)) {
        streets.set(toponym.key, toponym);
      }
    }
  }

  const cachePath = resolve(process.cwd(), CACHE_PATH);
  const cache = readCache(cachePath);
  const uncached = [...streets.values()].filter((toponym) => {
    const cached = cache[toponym.key];
    return (
      !cached ||
      (cached.matcher ?? 1) < STREET_MATCHER_VERSION ||
      (values["retry-not-found"] && cached.status === "not_found")
    );
  });
  const pending = uncached.slice(0, limit);
  console.log(
    `${streets.size} streets, ${streets.size - uncached.length} cached, ${pending.length} to fetch`,
  );

  let found = 0;
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(PAUSE_BETWEEN_BATCHES_MS);
    const batch = pending.slice(start, start + BATCH_SIZE);
    console.log(
      `[${start + batch.length}/${pending.length}] ${batch.map((t) => t.name).join(", ")}`,
    );

    const ways = await runQuery(buildQuery(batch));
    const fetchedAt = new Date().toISOString();
    for (const toponym of batch) {
      const entry = entryFor(toponym, ways, fetchedAt);
      cache[toponym.key] = entry;
      if (entry.status === "found") found += 1;
      else console.log(`  ✗ ${toponym.label}`);
    }
    writeCache(cachePath, cache); // after every batch, so an interrupted run loses nothing
  }

  const total = [...streets.keys()].filter((key) => cache[key]?.status === "found").length;
  console.log(
    `Done: ${found}/${pending.length} new found. With geometry: ${total}/${streets.size} streets of the current schedule.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
