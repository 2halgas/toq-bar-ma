"use client";

import { useMemo } from "react";

import { OutageFilters } from "@/components/filters/outage-filters";
import { MapPanel } from "@/components/map/map-panel";
import { EmptyState } from "@/components/outages/empty-state";
import { OutageList } from "@/components/outages/outage-list";
import { useAlmatyToday } from "@/hooks/use-almaty-today";
import { useOutageFilters } from "@/hooks/use-outage-filters";
import { countByDistrict, describeDateFilter, filterOutages } from "@/lib/filter";
import { OUTAGE_FORMS, pluralize } from "@/lib/plural";
import { type Outage } from "@/lib/schema";
import { toQueryString } from "@/lib/search-params";

interface OutagesExplorerProps {
  outages: Outage[];
}

export function OutagesExplorer({ outages }: OutagesExplorerProps) {
  const today = useAlmatyToday();
  const { filters, updateFilters, resetFilters } = useOutageFilters();

  const results = useMemo(() => filterOutages(outages, filters, today), [outages, filters, today]);

  // Counts ignore the district filter: picking a district shouldn't zero out the others.
  const districtCounts = useMemo(
    () => countByDistrict(filterOutages(outages, { ...filters, district: null }, today)),
    [outages, filters, today],
  );

  const isDefault = toQueryString(filters) === "";

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <OutageFilters
        filters={filters}
        districtCounts={districtCounts}
        isDefault={isDefault}
        onChange={updateFilters}
        onQueryCommit={(query) => updateFilters({ query })}
        onReset={resetFilters}
      />

      {/* Temporary placement — the final list/map layout and mobile tabs come in the next step. */}
      <MapPanel
        counts={districtCounts}
        selected={filters.district}
        periodLabel={describeDateFilter(filters.date)}
        onSelect={(district) => updateFilters({ district })}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
      />

      <section aria-labelledby="results-heading" className="space-y-3">
        <h2 id="results-heading" className="text-lg font-semibold">
          Отключения
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          Найдено {results.length} {pluralize(results.length, OUTAGE_FORMS)}
        </p>
        {results.length > 0 ? (
          <OutageList outages={results} today={today} />
        ) : (
          <EmptyState query={filters.query} hasActiveFilters={!isDefault} onReset={resetFilters} />
        )}
      </section>
    </div>
  );
}
