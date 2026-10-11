"use client";

import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

import { DateFilter } from "@/components/filters/date-filter";
import { ResFilter } from "@/components/filters/res-filter";
import { StreetSearch } from "@/components/filters/street-search";
import { Button } from "@/components/ui/button";
import { type OutageFilters as Filters, type ResCount } from "@/lib/filter";

interface OutageFiltersProps {
  filters: Filters;
  resOptions: ResCount[];
  isDefault: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onQueryCommit: (query: string) => void;
  onReset: () => void;
  /** "My places", right under the search it fills in. */
  savedPlaces: ReactNode;
}

export function OutageFilters({
  filters,
  resOptions,
  isDefault,
  onChange,
  onQueryCommit,
  onReset,
  savedPlaces,
}: OutageFiltersProps) {
  const t = useTranslations("Filters");

  return (
    <section aria-labelledby="filters-heading" className="space-y-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 id="filters-heading" className="text-lg font-semibold">
          {t("heading")}
        </h2>
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcwIcon aria-hidden />
            {t("reset")}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <StreetSearch value={filters.query} onCommit={onQueryCommit} />
        {savedPlaces}
      </div>
      <DateFilter value={filters.date} onChange={(date) => onChange({ date })} />
      <ResFilter value={filters.res} options={resOptions} onChange={(res) => onChange({ res })} />
    </section>
  );
}
