"use client";

import "leaflet/dist/leaflet.css";

import { type FeatureCollection } from "geojson";
import L, { type LeafletMouseEvent, type Path, type PathOptions } from "leaflet";
import { useMemo, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";

import { choroplethClassName, getLevel, type ChoroplethBucket } from "@/lib/choropleth";
import { type DistrictFeature, type DistrictsGeoJson } from "@/lib/geo";
import { OUTAGE_FORMS, pluralize } from "@/lib/plural";
import { DISTRICT_LABELS, type District } from "@/lib/schema";

// Standard OSM tiles need no API key; they're desaturated (light) or inverted (dark)
// with a CSS filter on the tile pane only, so district colours stay true. See globals.css.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface DistrictMapProps {
  geojson: DistrictsGeoJson;
  counts: Record<District, number>;
  buckets: ChoroplethBucket[];
  selected: District | null;
  onSelect: (district: District | null) => void;
}

function describe(district: District, count: number): string {
  return `${DISTRICT_LABELS[district]} район: ${count} ${pluralize(count, OUTAGE_FORMS)}`;
}

export function DistrictMap({ geojson, counts, buckets, selected, onSelect }: DistrictMapProps) {
  const layerRef = useRef<L.GeoJSON>(null);
  // Layers are re-created on every change; remember which district to re-focus for keyboard users.
  const refocusRef = useRef<District | null>(null);
  const bounds = useMemo(() => L.geoJSON(geojson).getBounds(), [geojson]);

  // Colours come from CSS classes (see globals.css), so the theme can change without
  // touching the layer. Leaflet applies `className` only when a path is created.
  const styleFor = (district: District): PathOptions => {
    const isSelected = district === selected;
    const isDimmed = selected !== null && !isSelected;
    const level = getLevel(counts[district], buckets);
    return {
      className: `district-path ${choroplethClassName(level)}${isSelected ? " is-selected" : ""}`,
      fillOpacity: isDimmed ? 0.35 : 0.75,
      weight: isSelected ? 3 : 1,
    };
  };

  const toggle = (district: District) => onSelect(district === selected ? null : district);

  const onEachFeature = (feature: DistrictFeature, layer: L.Layer) => {
    const { district } = feature.properties;
    const count = counts[district];
    const path = layer as Path;

    path.bindTooltip(
      `<strong>${DISTRICT_LABELS[district]}</strong><br>${count} ${pluralize(count, OUTAGE_FORMS)}`,
      { sticky: true, direction: "top", offset: [0, -8] },
    );
    path.on({
      click: () => toggle(district),
      mouseover: (event: LeafletMouseEvent) => {
        (event.target as Path).setStyle({ weight: district === selected ? 3 : 2 });
      },
      mouseout: (event: LeafletMouseEvent) => layerRef.current?.resetStyle(event.target as Path),
    });

    // SVG paths aren't focusable by default: make each district a keyboard-operable toggle.
    // Leaflet creates a fresh <path> every time the layer is (re-)added, e.g. under
    // React StrictMode, so this must run on every "add", not just the first.
    path.on("add", () => {
      const element = path.getElement();
      if (!(element instanceof SVGElement)) return;
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-pressed", String(district === selected));
      element.setAttribute("aria-label", describe(district, count));
      element.addEventListener("keydown", (event) => {
        if (!(event instanceof KeyboardEvent)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          refocusRef.current = district;
          toggle(district);
        }
      });
      element.addEventListener("focus", () => path.openTooltip());
      element.addEventListener("blur", () => path.closeTooltip());
      if (district === selected) path.bringToFront();
      if (refocusRef.current === district) {
        element.focus({ preventScroll: true });
        // Cleared asynchronously: StrictMode re-adds the layer within the same tick.
        window.setTimeout(() => (refocusRef.current = null));
      }
    });
  };

  // Leaflet layers are imperative; re-creating the 8 polygons on change is cheap and
  // keeps styles, tooltips and handlers in sync with props.
  const layerKey = [selected, ...Object.values(counts), buckets.length].join("|");

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [12, 12] }}
      maxBounds={bounds.pad(0.5)}
      minZoom={10}
      zoomSnap={0.25}
      className="size-full"
      attributionControl
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <GeoJSON
        key={layerKey}
        ref={layerRef}
        data={geojson as FeatureCollection}
        style={(feature) => styleFor((feature as DistrictFeature).properties.district)}
        onEachFeature={(feature, layer) => onEachFeature(feature as DistrictFeature, layer)}
      />
    </MapContainer>
  );
}
