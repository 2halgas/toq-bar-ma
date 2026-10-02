"use client";

import { useEffect, useState } from "react";

import { DISTRICTS_GEOJSON_URL, DistrictsGeoJsonSchema, type DistrictsGeoJson } from "@/lib/geo";

type GeoJsonState =
  { status: "loading" } | { status: "ready"; data: DistrictsGeoJson } | { status: "error" };

// Shared across mounts so switching tabs doesn't refetch the boundaries.
let request: Promise<DistrictsGeoJson> | undefined;

function loadDistricts(): Promise<DistrictsGeoJson> {
  request ??= fetch(DISTRICTS_GEOJSON_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<unknown>;
    })
    .then((json) => DistrictsGeoJsonSchema.parse(json))
    .catch((error: unknown) => {
      request = undefined; // allow a retry on next mount
      throw error;
    });
  return request;
}

export function useDistrictsGeoJson(): GeoJsonState {
  const [state, setState] = useState<GeoJsonState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadDistricts().then(
      (data) => active && setState({ status: "ready", data }),
      (error: unknown) => {
        console.error(`[map] Failed to load ${DISTRICTS_GEOJSON_URL}`, error);
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
