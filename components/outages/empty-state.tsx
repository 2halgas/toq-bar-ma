import { RotateCcwIcon, ZapIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ExternalLink } from "@/components/layout/external-link";
import { Button } from "@/components/ui/button";
import { formatDayMonth } from "@/lib/dates";
import { type ScheduleCoverage } from "@/lib/filter";
import { siteConfig } from "@/lib/site";

interface EmptyStateProps {
  query: string;
  hasActiveFilters: boolean;
  coverage: ScheduleCoverage;
  schedule: { weekStart: string; weekEnd: string };
  onReset: () => void;
  suggestions: string[];
  onSuggest: (query: string) => void;
}

export function EmptyState({
  query,
  hasActiveFilters,
  coverage,
  schedule,
  onReset,
  suggestions,
  onSuggest,
}: EmptyStateProps) {
  const t = useTranslations("Empty");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const period = tCommon("period", {
    from: formatDayMonth(schedule.weekStart, locale),
    to: formatDayMonth(schedule.weekEnd, locale),
  });

  const title =
    coverage === "after-schedule"
      ? t("afterScheduleTitle")
      : coverage === "before-schedule"
        ? t("beforeScheduleTitle")
        : hasActiveFilters
          ? t("noMatchesTitle")
          : t("nothingPlannedTitle");

  const description =
    coverage !== "covered"
      ? t("outsideSchedule", { period })
      : query
        ? t("noQueryMatches", { query })
        : hasActiveFilters
          ? t("noFilterMatches")
          : t("nothingPlanned");

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted" aria-hidden>
        <ZapIcon className="size-6 text-muted-foreground" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {coverage === "covered" && suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm">{t("didYouMean")}</span>
          {suggestions.map((name) => (
            <Button
              key={name}
              variant="secondary"
              size="sm"
              lang="ru"
              onClick={() => onSuggest(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
      {hasActiveFilters && (
        <Button variant="outline" className="mt-4" onClick={onReset}>
          <RotateCcwIcon aria-hidden />
          {t("resetFilters")}
        </Button>
      )}
      <p className="mt-6 max-w-sm text-xs text-muted-foreground">
        {t.rich("plannedOnly", {
          link: (chunks) => <ExternalLink href={siteConfig.azhkScheduleUrl}>{chunks}</ExternalLink>,
        })}
      </p>
    </div>
  );
}
