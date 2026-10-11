import { CalendarPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/outages/empty-state";
import { OutageList } from "@/components/outages/outage-list";
import { Button } from "@/components/ui/button";
import { useCalendarExport } from "@/hooks/use-calendar-export";
import { type ScheduleCoverage } from "@/lib/filter";
import { type AzhkOutage } from "@/lib/azhk/schema";
import { cn } from "@/lib/utils";

const MAX_EXPORT_ALL = 30;

interface ResultsSectionProps {
  results: AzhkOutage[];
  today: string;
  query: string;
  hasActiveFilters: boolean;
  coverage: ScheduleCoverage;
  schedule: { weekStart: string; weekEnd: string };
  onReset: () => void;
  /** "Did you mean" place names when the query found nothing. */
  suggestions: string[];
  onSuggest: (query: string) => void;
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
  suggestions,
  onSuggest,
  hideHeading = false,
}: ResultsSectionProps) {
  const t = useTranslations("Results");
  const tCalendar = useTranslations("Calendar");
  const exportToCalendar = useCalendarExport();
  // "Add all" only for a search: someone checking their street, not the whole city.
  const canExportAll = query !== "" && results.length > 1 && results.length <= MAX_EXPORT_ALL;
  const tCommon = useTranslations("Common");
  // Empty in Russian; elsewhere explains why addresses are in Russian.
  const addressesNote = tCommon("addressesInRussian");

  return (
    <section aria-labelledby="results-heading" className="space-y-3">
      <h2 id="results-heading" className={cn("text-lg font-semibold", hideHeading && "sr-only")}>
        {t("heading")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-muted-foreground">
          {t("found", { count: results.length })}
        </p>
        {canExportAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCalendar(results, "toq-bar-ma.ics")}
          >
            <CalendarPlusIcon aria-hidden />
            {tCalendar("addAll", { count: results.length })}
          </Button>
        )}
      </div>
      {addressesNote && results.length > 0 && (
        <p className="text-xs text-muted-foreground">{addressesNote}</p>
      )}
      {results.length > 0 ? (
        <OutageList outages={results} today={today} />
      ) : (
        <EmptyState
          query={query}
          hasActiveFilters={hasActiveFilters}
          coverage={coverage}
          schedule={schedule}
          onReset={onReset}
          suggestions={suggestions}
          onSuggest={onSuggest}
        />
      )}
    </section>
  );
}
