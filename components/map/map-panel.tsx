"use client";

import { MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode } from "react";

import { type MapPoint } from "@/lib/map-points";
import { OUTAGE_FORMS, pluralize } from "@/lib/plural";
import { cn } from "@/lib/utils";

// Leaflet touches `window` on import, so the map itself never renders on the server.
const OutageMap = dynamic(
  () => import("@/components/map/outage-map").then((module) => module.OutageMap),
  { ssr: false, loading: () => <MapPlaceholder>Загружаем карту…</MapPlaceholder> },
);

interface MapPanelProps {
  points: MapPoint[];
  /** Outages in the current results that have no point on the map. */
  unmappedCount: number;
  onShowInList: (label: string) => void;
  className?: string;
}

export function MapPanel({ points, unmappedCount, onShowInList, className }: MapPanelProps) {
  return (
    <section aria-labelledby="map-heading" className={cn("flex flex-col gap-3", className)}>
      <div>
        <h2 id="map-heading" className="text-lg font-semibold">
          Карта
        </h2>
        <p className="text-sm text-muted-foreground">
          Улицы и микрорайоны из графика. Нажмите на точку, чтобы увидеть отключения.
        </p>
      </div>

      <div className="relative isolate h-[60dvh] min-h-80 overflow-hidden rounded-xl border bg-muted lg:h-auto lg:min-h-0 lg:flex-1">
        <OutageMap points={points} onShowInList={onShowInList} />
      </div>

      <p className="text-xs text-muted-foreground">
        Точка — примерное положение улицы или микрорайона, а не конкретного дома.
        {unmappedCount > 0 &&
          ` Без точки на карте: ${unmappedCount} ${pluralize(unmappedCount, OUTAGE_FORMS)} — смотрите в списке.`}
      </p>
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
