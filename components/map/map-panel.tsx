"use client";

import { MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

import { type MapPoint } from "@/lib/map-points";
import { cn } from "@/lib/utils";

// Leaflet touches `window` on import, so the map itself never renders on the server.
const OutageMap = dynamic(
  () => import("@/components/map/outage-map").then((module) => module.OutageMap),
  { ssr: false, loading: () => <MapLoading /> },
);

interface MapPanelProps {
  points: MapPoint[];
  /** Outages in the current results that have no point on the map. */
  unmappedCount: number;
  onShowInList: (label: string) => void;
  className?: string;
}

export function MapPanel({ points, unmappedCount, onShowInList, className }: MapPanelProps) {
  const t = useTranslations("Map");

  return (
    <section aria-labelledby="map-heading" className={cn("flex flex-col gap-3", className)}>
      <div>
        <h2 id="map-heading" className="text-lg font-semibold">
          {t("heading")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="relative isolate h-[60dvh] min-h-80 overflow-hidden rounded-xl border bg-muted lg:h-auto lg:min-h-0 lg:flex-1">
        <OutageMap points={points} onShowInList={onShowInList} />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("accuracy")}
        {unmappedCount > 0 && ` ${t("unmapped", { count: unmappedCount })}`}
      </p>
    </section>
  );
}

function MapLoading() {
  const t = useTranslations("Map");
  return <MapPlaceholder>{t("loading")}</MapPlaceholder>;
}

function MapPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
      <MapIcon className="size-6" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
