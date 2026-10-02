import { EmptyState } from "@/components/outages/empty-state";
import { OutageList } from "@/components/outages/outage-list";
import { type ScheduleCoverage } from "@/lib/filter";
import { OUTAGE_FORMS, pluralize } from "@/lib/plural";
import { type AzhkOutage } from "@/lib/azhk/schema";
import { cn } from "@/lib/utils";

interface ResultsSectionProps {
  results: AzhkOutage[];
  today: string;
  query: string;
  hasActiveFilters: boolean;
  coverage: ScheduleCoverage;
  schedule: { weekStart: string; weekEnd: string };
  onReset: () => void;
  /** Hide the visible heading when a tab label already names the section. */
  hideHeading?: boolean;
}

export function ResultsSection({
  results,
  today,
  query,
  hasActiveFilters,
  coverage,
  schedule,
  onReset,
  hideHeading = false,
}: ResultsSectionProps) {
  return (
    <section aria-labelledby="results-heading" className="space-y-3">
      <h2 id="results-heading" className={cn("text-lg font-semibold", hideHeading && "sr-only")}>
        Отключения
      </h2>
      <p role="status" className="text-sm text-muted-foreground">
        Найдено {results.length} {pluralize(results.length, OUTAGE_FORMS)}
      </p>
      {results.length > 0 ? (
        <OutageList outages={results} today={today} />
      ) : (
        <EmptyState
          query={query}
          hasActiveFilters={hasActiveFilters}
          coverage={coverage}
          schedule={schedule}
          onReset={onReset}
        />
      )}
    </section>
  );
}
