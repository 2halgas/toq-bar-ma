import { CalendarClockIcon, CalendarRangeIcon } from "lucide-react";

import { ExternalLink } from "@/components/layout/external-link";
import { formatDayMonth } from "@/lib/dates";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface ScheduleInfo {
  title: string;
  sourceUrl: string;
  weekStart: string;
  weekEnd: string;
}

interface ScheduleNoticeProps {
  schedule: ScheduleInfo;
  today: string;
}

/** Which week the data covers — and a warning once that week is over. */
export function ScheduleNotice({ schedule, today }: ScheduleNoticeProps) {
  const isOutdated = today > schedule.weekEnd;
  const period = `с ${formatDayMonth(schedule.weekStart)} по ${formatDayMonth(schedule.weekEnd)}`;
  const Icon = isOutdated ? CalendarClockIcon : CalendarRangeIcon;

  return (
    <p
      className={cn(
        "flex gap-2.5 rounded-xl border px-4 py-3 text-sm",
        isOutdated
          ? "border-notice-border bg-notice text-notice-foreground"
          : "text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {isOutdated ? (
        <span>
          <strong className="font-semibold">Новый график ещё не опубликован.</strong> Последний —{" "}
          {period}. Проверьте{" "}
          <ExternalLink href={siteConfig.azhkScheduleUrl}>список графиков АЖК</ExternalLink>.
        </span>
      ) : (
        <span>
          <ExternalLink href={schedule.sourceUrl} className="font-normal">
            График АЖК {period}
          </ExternalLink>
          . Отключения за другие дни появятся, когда АЖК опубликует следующий график.
        </span>
      )}
    </p>
  );
}
