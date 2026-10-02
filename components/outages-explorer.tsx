"use client";

import { useMemo } from "react";

import { OutageFilters } from "@/components/filters/outage-filters";
import { ResultsSection } from "@/components/outages/results-section";
import { ScheduleNotice, type ScheduleInfo } from "@/components/outages/schedule-notice";
import { useAlmatyToday } from "@/hooks/use-almaty-today";
import { useOutageFilters } from "@/hooks/use-outage-filters";
import { type AzhkOutage } from "@/lib/azhk/schema";
import { countByRes, filterOutages, getScheduleCoverage, resolveDateRange } from "@/lib/filter";
import { toQueryString } from "@/lib/search-params";

interface OutagesExplorerProps {
  outages: AzhkOutage[];
  schedule: ScheduleInfo;
}

export function OutagesExplorer({ outages, schedule }: OutagesExplorerProps) {
  const today = useAlmatyToday();
  const { filters, updateFilters, resetFilters } = useOutageFilters();

  const results = useMemo(() => filterOutages(outages, filters, today), [outages, filters, today]);

  // Counts ignore the РЭС filter: picking one shouldn't zero out the others.
  const resOptions = useMemo(
    () => countByRes(outages, filterOutages(outages, { ...filters, res: null }, today)),
    [outages, filters, today],
  );

  const isDefault = toQueryString(filters) === "";
  const coverage = getScheduleCoverage(resolveDateRange(filters.date, today), schedule);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 [--sticky-offset:0px] sm:px-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:gap-8">
      {/* On desktop the filters stay in view while the list scrolls. */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <OutageFilters
          filters={filters}
          resOptions={resOptions}
          isDefault={isDefault}
          onChange={updateFilters}
          onQueryCommit={(query) => updateFilters({ query })}
          onReset={resetFilters}
        />
      </div>

      <div className="min-w-0 space-y-4">
        <ScheduleNotice schedule={schedule} today={today} />
        <ResultsSection
          results={results}
          today={today}
          query={filters.query}
          hasActiveFilters={!isDefault}
          coverage={coverage}
          schedule={schedule}
          onReset={resetFilters}
        />
      </div>
    </div>
  );
}
