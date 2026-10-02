import { RotateCcwIcon, ZapIcon } from "lucide-react";

import { ExternalLink } from "@/components/layout/external-link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

interface EmptyStateProps {
  query: string;
  hasActiveFilters: boolean;
  onReset: () => void;
}

export function EmptyState({ query, hasActiveFilters, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted" aria-hidden>
        <ZapIcon className="size-6 text-muted-foreground" />
      </span>
      <h3 className="mt-4 font-semibold">
        {hasActiveFilters ? "Ничего не найдено" : "На этой неделе плановых отключений нет"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {query ? (
          <>
            По запросу «{query}» в выбранные даты плановых отключений нет. Проверьте написание или
            выберите другую дату.
          </>
        ) : hasActiveFilters ? (
          "По выбранным фильтрам плановых отключений нет. Попробуйте другую дату или район."
        ) : (
          "В опубликованных графиках пока ничего нет."
        )}
      </p>
      {hasActiveFilters && (
        <Button variant="outline" className="mt-4" onClick={onReset}>
          <RotateCcwIcon aria-hidden />
          Сбросить фильтры
        </Button>
      )}
      <p className="mt-6 max-w-sm text-xs text-muted-foreground">
        Здесь только плановые работы. Аварийные отключения не отображаются, а график может меняться
        — сверьтесь с <ExternalLink href={siteConfig.azhkScheduleUrl}>сайтом АЖК</ExternalLink>.
      </p>
    </div>
  );
}
