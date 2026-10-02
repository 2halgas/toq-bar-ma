"use client";

import { ListIcon, MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { OutageFilters } from "@/components/filters/outage-filters";
import { MapPanel } from "@/components/map/map-panel";
import { ResultsSection } from "@/components/outages/results-section";
import { ScheduleNotice, type ScheduleInfo } from "@/components/outages/schedule-notice";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlmatyToday } from "@/hooks/use-almaty-today";
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { useOutageFilters } from "@/hooks/use-outage-filters";
import { countByRes, filterOutages, getScheduleCoverage, resolveDateRange } from "@/lib/filter";
import { type MapLocation } from "@/lib/geo/geocache";
import { buildMapPoints, countUnmapped, type OutageView } from "@/lib/map-points";
import { toQueryString } from "@/lib/search-params";

type MobileView = "list" | "map";

interface OutagesExplorerProps {
  outages: OutageView[];
  locations: Record<string, MapLocation>;
  schedule: ScheduleInfo;
}

export function OutagesExplorer({ outages, locations, schedule }: OutagesExplorerProps) {
  const t = useTranslations("Explorer");
  const today = useAlmatyToday();
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const { filters, updateFilters, resetFilters } = useOutageFilters();
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const results = useMemo(() => filterOutages(outages, filters, today), [outages, filters, today]);
  const points = useMemo(() => buildMapPoints(results, locations), [results, locations]);
  const unmappedCount = useMemo(() => countUnmapped(results, locations), [results, locations]);

  // Counts ignore the РЭС filter: picking one shouldn't zero out the others.
  const resOptions = useMemo(
    () => countByRes(outages, filterOutages(outages, { ...filters, res: null }, today)),
    [outages, filters, today],
  );

  const isDefault = toQueryString(filters) === "";
  const coverage = getScheduleCoverage(resolveDateRange(filters.date, today), schedule);

  // From a map popup: search for that place and bring the list into view.
  const showInList = (label: string) => {
    updateFilters({ query: label });
    setMobileView("list");
    document.getElementById("results-heading")?.scrollIntoView({ behavior: "smooth" });
  };

  const filtersPanel = (
    <OutageFilters
      filters={filters}
      resOptions={resOptions}
      isDefault={isDefault}
      onChange={updateFilters}
      onQueryCommit={(query) => updateFilters({ query })}
      onReset={resetFilters}
    />
  );

  const renderResults = (hideHeading: boolean) => (
    <div className="space-y-4">
      <ScheduleNotice schedule={schedule} today={today} />
      <ResultsSection
        results={results}
        today={today}
        query={filters.query}
        hasActiveFilters={!isDefault}
        coverage={coverage}
        schedule={schedule}
        onReset={resetFilters}
        hideHeading={hideHeading}
      />
    </div>
  );

  const renderMap = (className: string) => (
    <MapPanel
      points={points}
      unmappedCount={unmappedCount}
      onShowInList={showInList}
      className={className}
    />
  );

  // One layout or the other is rendered (never both), so Leaflet mounts exactly once.
  if (isDesktop) {
    return (
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] gap-8 px-6 py-4 [--sticky-offset:0px]">
        <div className="min-w-0 space-y-8">
          {filtersPanel}
          {renderResults(false)}
        </div>
        {/* The map stays in view while the list scrolls. */}
        <div className="sticky top-4 h-[calc(100dvh-2rem)] self-start">{renderMap("h-full")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 [--sticky-offset:3.75rem] sm:px-6">
      {filtersPanel}

      <Tabs
        value={mobileView}
        onValueChange={(value) => (value === "list" || value === "map") && setMobileView(value)}
      >
        {/* Sticky so you can jump to the map from anywhere in a long list. */}
        <div className="sticky top-0 z-20 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6">
          <TabsList className="h-11! w-full">
            <TabsTrigger value="list" className="text-sm">
              <ListIcon aria-hidden />
              {t("listTab")}
              <span className="text-muted-foreground tabular-nums">{results.length}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="text-sm">
              <MapIcon aria-hidden />
              {t("mapTab")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="text-base">
          {renderResults(true)}
        </TabsContent>

        <TabsContent value="map" className="space-y-3 text-base">
          {renderMap("")}
          {results.length > 0 && (
            <Button variant="outline" className="h-11 w-full" onClick={() => setMobileView("list")}>
              <ListIcon aria-hidden />
              {t("showAsList", { count: results.length })}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
