import { CalendarClockIcon, CalendarRangeIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Schedule");
  const tCommon = useTranslations("Common");
  const isOutdated = today > schedule.weekEnd;
  const period = tCommon("period", {
    from: formatDayMonth(schedule.weekStart),
    to: formatDayMonth(schedule.weekEnd),
  });
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
          <strong className="font-semibold">{t("outdatedTitle")}</strong>{" "}
          {t.rich("outdated", {
            period,
            link: (chunks) => (
              <ExternalLink href={siteConfig.azhkScheduleUrl}>{chunks}</ExternalLink>
            ),
          })}
        </span>
      ) : (
        <span>
          {t.rich("current", {
            period,
            link: (chunks) => (
              <ExternalLink href={schedule.sourceUrl} className="font-normal">
                {chunks}
              </ExternalLink>
            ),
          })}
        </span>
      )}
    </p>
  );
}
