"use client";

import { ListIcon, MapIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { OutageFilters } from "@/components/filters/outage-filters";
import { MapPanel } from "@/components/map/map-panel";
import { ResultsSection } from "@/components/outages/results-section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlmatyToday } from "@/hooks/use-almaty-today";
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { useOutageFilters } from "@/hooks/use-outage-filters";
import { countByDistrict, describeDateFilter, filterOutages } from "@/lib/filter";
import { type Outage } from "@/lib/schema";
import { toQueryString } from "@/lib/search-params";

type MobileView = "list" | "map";

interface OutagesExplorerProps {
  outages: Outage[];
}

export function OutagesExplorer({ outages }: OutagesExplorerProps) {
  const today = useAlmatyToday();
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const { filters, updateFilters, resetFilters } = useOutageFilters();
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const results = useMemo(() => filterOutages(outages, filters, today), [outages, filters, today]);

  // Counts ignore the district filter: picking a district shouldn't zero out the others.
  const districtCounts = useMemo(
    () => countByDistrict(filterOutages(outages, { ...filters, district: null }, today)),
    [outages, filters, today],
  );

  const isDefault = toQueryString(filters) === "";

  const filtersPanel = (
    <OutageFilters
      filters={filters}
      districtCounts={districtCounts}
      isDefault={isDefault}
      onChange={updateFilters}
      onQueryCommit={(query) => updateFilters({ query })}
      onReset={resetFilters}
    />
  );

  const renderResults = (hideHeading: boolean) => (
    <ResultsSection
      results={results}
      today={today}
      query={filters.query}
      hasActiveFilters={!isDefault}
      onReset={resetFilters}
      hideHeading={hideHeading}
    />
  );

  const renderMap = (className: string) => (
    <MapPanel
      counts={districtCounts}
      selected={filters.district}
      periodLabel={describeDateFilter(filters.date)}
      onSelect={(district) => updateFilters({ district })}
      className={className}
    />
  );

  // One layout or the other is rendered (never both), so Leaflet mounts exactly once.
  if (isDesktop) {
    return (
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] gap-8 px-6 py-4 [--sticky-offset:0px]">
        <div className="space-y-8">
          {filtersPanel}
          {renderResults(false)}
        </div>
        {/* The map stays in view while the list scrolls. */}
        <aside className="sticky top-4 h-[calc(100dvh-2rem)] self-start">
          {renderMap("h-full")}
        </aside>
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
              Список
              <span className="text-muted-foreground tabular-nums">{results.length}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="text-sm">
              <MapIcon aria-hidden />
              Карта
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
              Показать списком: {results.length}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
