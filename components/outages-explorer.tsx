"use client";

import { useMemo } from "react";

import { OutageFilters } from "@/components/filters/outage-filters";
import { useAlmatyToday } from "@/hooks/use-almaty-today";
import { useOutageFilters } from "@/hooks/use-outage-filters";
import { countByDistrict, filterOutages } from "@/lib/filter";
import { pluralize } from "@/lib/plural";
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

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <OutageFilters
        filters={filters}
        districtCounts={districtCounts}
        isDefault={toQueryString(filters) === ""}
        onChange={updateFilters}
        onQueryCommit={(query) => updateFilters({ query })}
        onReset={resetFilters}
      />

      <section aria-labelledby="results-heading" className="space-y-3">
        <h2 id="results-heading" className="text-lg font-semibold">
          Отключения
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          Найдено {results.length}{" "}
          {pluralize(results.length, { one: "отключение", few: "отключения", many: "отключений" })}
        </p>
        {/* Temporary plain list — replaced by grouped cards in the next step. */}
        <ul className="space-y-1 text-sm">
          {results.map((outage) => (
            <li key={outage.id}>
              {outage.date} · {outage.timeFrom}–{outage.timeTo} · {outage.street}, {outage.houses}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
