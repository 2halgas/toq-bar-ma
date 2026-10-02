"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

import L, { type MarkerCluster } from "leaflet";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { Button } from "@/components/ui/button";
import { formatRes } from "@/lib/azhk/schema";
import { formatShortDate } from "@/lib/dates";
import { ALMATY_VIEWBOX } from "@/lib/geo/geocache";
import { type MapPoint } from "@/lib/map-points";

// Standard OSM tiles need no API key; globals.css desaturates/inverts them per theme.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const ALMATY_BOUNDS = L.latLngBounds(
  [ALMATY_VIEWBOX.south, ALMATY_VIEWBOX.west],
  [ALMATY_VIEWBOX.north, ALMATY_VIEWBOX.east],
);
const POPUP_LIST_LIMIT = 4;

/** Marker options carry outage ids so clusters can count each outage once. */
type OutageMarkerOptions = L.MarkerOptions & { outageIds: string[] };

function outageIcon(count: number): L.DivIcon {
  const size = count >= 10 ? 34 : count >= 3 ? 30 : 26;
  return L.divIcon({
    className: "outage-marker-icon",
    html: `<span class="outage-marker" style="--size:${size}px">${count}</span>`,
    iconSize: [size, size],
  });
}

/**
 * Clusters show how many distinct outages are inside. One outage often lists
 * several streets, so summing the markers' numbers would count it several times.
 */
function clusterIcon(cluster: MarkerCluster): L.DivIcon {
  const ids = new Set(
    cluster
      .getAllChildMarkers()
      .flatMap((marker) => (marker.options as OutageMarkerOptions).outageIds ?? []),
  );
  const total = ids.size;
  const size = total >= 50 ? 48 : total >= 15 ? 42 : 36;
  return L.divIcon({
    className: "outage-marker-icon",
    html: `<span class="outage-marker outage-marker--cluster" style="--size:${size}px">${total}</span>`,
    iconSize: [size, size],
  });
}

/**
 * Frames the visible points: whenever the set changes (new date, РЭС, search) and
 * whenever the container is resized — e.g. a mobile tab becoming visible, which
 * would otherwise leave Leaflet fitting to a stale size and clipping points.
 */
function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const signature = points.map((point) => point.key).join("|");

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (points.length === 0) {
        map.fitBounds(ALMATY_BOUNDS);
        return;
      }
      const bounds = L.latLngBounds(
        points.map((point) => [point.lat, point.lon] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    };

    fit();
    let lastWidth = map.getContainer().clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (Math.abs(width - lastWidth) > 1) {
        lastWidth = width;
        fit();
      }
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // `signature` captures `points`; refitting on every new array would fight the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature]);

  return null;
}

export interface OutageMapProps {
  points: MapPoint[];
  onShowInList: (label: string) => void;
}

export function OutageMap({ points, onShowInList }: OutageMapProps) {
  const t = useTranslations("Map");
  const markers = useMemo(
    () =>
      points.map((point) => ({
        point,
        icon: outageIcon(point.outages.length),
        options: { outageIds: point.outages.map((outage) => outage.id) },
      })),
    [points],
  );

  return (
    <MapContainer
      bounds={ALMATY_BOUNDS}
      maxBounds={ALMATY_BOUNDS.pad(0.3)}
      minZoom={9}
      zoomSnap={0.5}
      className="size-full"
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <FitToPoints points={points} />
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={44}
        iconCreateFunction={clusterIcon}
      >
        {markers.map(({ point, icon, options }) => (
          <Marker
            key={point.key}
            position={[point.lat, point.lon]}
            icon={icon}
            title={t("markerTitle", { label: point.label, count: point.outages.length })}
            {...options}
          >
            <Popup>
              <div className="min-w-52 space-y-2 text-sm">
                <p className="font-semibold">{point.label}</p>
                <ul className="space-y-1 text-muted-foreground">
                  {point.outages.slice(0, POPUP_LIST_LIMIT).map((outage) => (
                    <li key={outage.id} className="tabular-nums">
                      {formatShortDate(outage.date)} · {outage.timeFrom}–{outage.timeTo} ·{" "}
                      {formatRes(outage.res)}
                      {outage.substations[0] && ` · ${outage.substations[0]}`}
                    </li>
                  ))}
                  {point.outages.length > POPUP_LIST_LIMIT && (
                    <li>{t("more", { count: point.outages.length - POPUP_LIST_LIMIT })}</li>
                  )}
                </ul>
                <Button size="sm" className="w-full" onClick={() => onShowInList(point.label)}>
                  {t("showInList")}
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
