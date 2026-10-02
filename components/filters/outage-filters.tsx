"use client";

import { RotateCcwIcon } from "lucide-react";

import { DateFilter } from "@/components/filters/date-filter";
import { DistrictFilter } from "@/components/filters/district-filter";
import { StreetSearch } from "@/components/filters/street-search";
import { Button } from "@/components/ui/button";
import { type OutageFilters as Filters } from "@/lib/filter";
import { type District } from "@/lib/schema";

interface OutageFiltersProps {
  filters: Filters;
  districtCounts: Record<District, number>;
  isDefault: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onQueryCommit: (query: string) => void;
  onReset: () => void;
}

export function OutageFilters({
  filters,
  districtCounts,
  isDefault,
  onChange,
  onQueryCommit,
  onReset,
}: OutageFiltersProps) {
  return (
    <section aria-labelledby="filters-heading" className="space-y-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 id="filters-heading" className="text-lg font-semibold">
          Поиск
        </h2>
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcwIcon aria-hidden />
            Сбросить
          </Button>
        )}
      </div>
      <StreetSearch value={filters.query} onCommit={onQueryCommit} />
      <DateFilter value={filters.date} onChange={(date) => onChange({ date })} />
      <DistrictFilter
        value={filters.district}
        counts={districtCounts}
        onChange={(district) => onChange({ district })}
      />
    </section>
  );
}
