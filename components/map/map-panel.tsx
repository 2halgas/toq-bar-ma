"use client";

import { MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useMemo } from "react";

import { MapLegend } from "@/components/map/map-legend";
import { useDistrictsGeoJson } from "@/components/map/use-districts-geojson";
import { buildBuckets } from "@/lib/choropleth";
import { type District } from "@/lib/schema";
import { cn } from "@/lib/utils";

// Leaflet touches `window` on import, so the map itself never renders on the server.
const DistrictMap = dynamic(
  () => import("@/components/map/district-map").then((module) => module.DistrictMap),
  { ssr: false, loading: () => <MapPlaceholder>Загружаем карту…</MapPlaceholder> },
);

interface MapPanelProps {
  counts: Record<District, number>;
  selected: District | null;
  periodLabel: string;
  onSelect: (district: District | null) => void;
  className?: string;
}

export function MapPanel({ counts, selected, periodLabel, onSelect, className }: MapPanelProps) {
  const geojson = useDistrictsGeoJson();
  const buckets = useMemo(() => buildBuckets(Math.max(0, ...Object.values(counts))), [counts]);

  return (
    <section aria-labelledby="map-heading" className={cn("flex flex-col gap-3", className)}>
      <div>
        <h2 id="map-heading" className="text-lg font-semibold">
          Карта районов
        </h2>
        <p className="text-sm text-muted-foreground">
          Нажмите на район, чтобы показать только его отключения.
        </p>
      </div>

      <div className="relative isolate h-[60dvh] min-h-80 overflow-hidden rounded-xl border bg-muted lg:h-auto lg:min-h-0 lg:flex-1">
        {geojson.status === "ready" ? (
          <DistrictMap
            geojson={geojson.data}
            counts={counts}
            buckets={buckets}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <MapPlaceholder>
            {geojson.status === "loading"
              ? "Загружаем границы районов…"
              : "Не удалось загрузить карту. Список отключений по-прежнему доступен."}
          </MapPlaceholder>
        )}
      </div>

      <MapLegend buckets={buckets} periodLabel={periodLabel} />
    </section>
  );
}

function MapPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
      <MapIcon className="size-6" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
