/**
 * Downloads Almaty district boundaries from OpenStreetMap (Overpass API),
 * simplifies them and writes public/geo/almaty-districts.geojson.
 *
 *   pnpm geo:fetch
 *
 * Data © OpenStreetMap contributors, ODbL — keep the attribution on the map.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import simplify from "@turf/simplify";
import truncate from "@turf/truncate";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import osmtogeojson from "osmtogeojson";

import { DistrictsGeoJsonSchema, type DistrictFeature } from "@/lib/geo";
import { DISTRICT_IDS, DISTRICT_LABELS, type District } from "@/lib/schema";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OUTPUT_PATH = "public/geo/almaty-districts.geojson";

// City districts of Almaty are tagged admin_level=6 in OSM.
const QUERY = `
[out:json][timeout:90];
area["name:en"="Almaty"]["boundary"="administrative"]->.city;
rel(area.city)["boundary"="administrative"]["admin_level"="6"];
out geom;
`;

/** ~30 m: plenty for a city-wide choropleth, keeps the file small. */
const SIMPLIFY_TOLERANCE_DEG = 0.0003;
const COORDINATE_PRECISION = 5;

const DISTRICT_BY_RU_NAME = new Map<string, District>(
  DISTRICT_IDS.map((id) => [`${DISTRICT_LABELS[id]} район`.toLowerCase(), id]),
);

async function fetchOsm(): Promise<unknown> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Overpass rejects requests without a descriptive User-Agent.
      "User-Agent": "toq-bar-ma/0.1 (Almaty planned outages map)",
    },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!response.ok) throw new Error(`Overpass responded ${response.status} ${response.statusText}`);
  return response.json();
}

async function main(): Promise<void> {
  const osm = await fetchOsm();
  const geojson = osmtogeojson(osm) as FeatureCollection;

  const features: DistrictFeature[] = [];
  for (const feature of geojson.features) {
    const nameRu = String(feature.properties?.["name:ru"] ?? "").toLowerCase();
    const district = DISTRICT_BY_RU_NAME.get(nameRu);
    const { geometry } = feature;
    if (!district || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) continue;

    const simplified = truncate(
      simplify(geometry as Polygon | MultiPolygon, { tolerance: SIMPLIFY_TOLERANCE_DEG }),
      { precision: COORDINATE_PRECISION },
    );
    features.push({
      type: "Feature",
      properties: { district },
      geometry: simplified as DistrictFeature["geometry"],
    });
  }

  const missing = DISTRICT_IDS.filter((id) => !features.some((f) => f.properties.district === id));
  if (missing.length > 0)
    throw new Error(`Districts not found in OSM response: ${missing.join(", ")}`);

  features.sort(
    (a, b) =>
      DISTRICT_IDS.indexOf(a.properties.district) - DISTRICT_IDS.indexOf(b.properties.district),
  );
  const output = DistrictsGeoJsonSchema.parse({ type: "FeatureCollection", features });

  const json = JSON.stringify(output);
  writeFileSync(resolve(process.cwd(), OUTPUT_PATH), `${json}\n`);
  console.log(
    `Wrote ${features.length} districts to ${OUTPUT_PATH} (${(json.length / 1024).toFixed(1)} KB)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
