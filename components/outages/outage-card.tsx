"use client";

import { CableIcon, CalendarPlusIcon, ClockIcon, MapPinIcon, WrenchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { ExternalLink } from "@/components/layout/external-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCalendarExport } from "@/hooks/use-calendar-export";
import { PLACE_HIDDEN, type AzhkOutage } from "@/lib/azhk/schema";
import { formatDuration, formatShortDate, getRelativeDay, type RelativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

const RELATIVE_DAY_BADGE_CLASSES: Record<RelativeDay, string> = {
  today: "bg-brand text-neutral-950",
  tomorrow: "bg-secondary text-secondary-foreground",
};

/** Places longer than this are clamped with a "show more" toggle. */
const LONG_PLACE_CHARS = 180;

interface OutageCardProps {
  outage: AzhkOutage;
  today: string;
}

export function OutageCard({ outage, today }: OutageCardProps) {
  const t = useTranslations("Card");
  const tCommon = useTranslations("Common");
  const tRepair = useTranslations("RepairType");
  const tCalendar = useTranslations("Calendar");
  const locale = useLocale();
  const exportToCalendar = useCalendarExport();
  const placeId = useId();
  const [expanded, setExpanded] = useState(false);
  const relativeDay = getRelativeDay(outage.date, today);

  const isHidden = outage.place === PLACE_HIDDEN;
  const isLong = outage.place.length > LONG_PLACE_CHARS;

  return (
    <article className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3">
        {/* Time and duration never break inside; in narrow cards the duration wraps as a whole. */}
        <h5 className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-2 font-semibold whitespace-nowrap tabular-nums">
            <ClockIcon className="size-4 text-muted-foreground" aria-hidden />
            {outage.timeFrom}–{outage.timeTo}
          </span>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatDuration(outage.timeFrom, outage.timeTo, {
              hours: (count) => tCommon("hours", { count }),
              minutes: (count) => tCommon("minutes", { count }),
            })}
          </span>
        </h5>
        {relativeDay && (
          <Badge className={RELATIVE_DAY_BADGE_CLASSES[relativeDay]}>{t(relativeDay)}</Badge>
        )}
      </div>

      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex gap-2">
          <dt>
            <MapPinIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">{t("where")}</span>
          </dt>
          <dd className="min-w-0 flex-1">
            {/* Addresses come from the AZhK schedule in Russian, whatever the UI language. */}
            <p
              id={placeId}
              lang={isHidden ? undefined : "ru"}
              className={cn(
                // «anywhere», not «break-word»: AZhK writes runs like «д.77,-45,оф.18,д.78,…»
                // without spaces, and only «anywhere» stops them from widening the card.
                "leading-relaxed wrap-anywhere",
                isHidden && "text-muted-foreground italic",
                isLong && !expanded && "line-clamp-4",
              )}
            >
              {isHidden ? t("placeHidden") : outage.place}
            </p>
            {isLong && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 py-1"
                aria-expanded={expanded}
                aria-controls={placeId}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? t("showLess") : t("showMore")}
              </Button>
            )}
          </dd>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <dt>
            <CableIcon className="mt-0.5 size-4" aria-hidden />
            <span className="sr-only">{t("equipment")}</span>
          </dt>
          <dd className="min-w-0 wrap-anywhere" lang="ru">
            {outage.dispatchName}
          </dd>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <dt>
            <WrenchIcon className="mt-0.5 size-4" aria-hidden />
            <span className="sr-only">{t("workType")}</span>
          </dt>
          <dd className="flex flex-1 flex-wrap justify-between gap-x-3 gap-y-1">
            <span>{tRepair(outage.repairType)}</span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-sm text-xs leading-5 underline underline-offset-4 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={tCalendar("addLabel", {
                  date: formatShortDate(outage.date, locale),
                  hours: `${outage.timeFrom}–${outage.timeTo}`,
                })}
                onClick={() => exportToCalendar([outage], `toq-bar-ma-${outage.date}.ics`)}
              >
                <CalendarPlusIcon className="size-3.5" aria-hidden />
                {tCalendar("add")}
              </button>
              <ExternalLink href={outage.sourceUrl} className="text-xs leading-5 font-normal">
                {t("source")}
                <span className="sr-only">{t("sourceDetails")}</span>
              </ExternalLink>
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
