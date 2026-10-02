"use client";

import { CableIcon, ClockIcon, MapPinIcon, WrenchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { ExternalLink } from "@/components/layout/external-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLACE_HIDDEN, type AzhkOutage } from "@/lib/azhk/schema";
import { formatDuration, getRelativeDay, type RelativeDay } from "@/lib/dates";
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
  const tRepair = useTranslations("RepairType");
  const placeId = useId();
  const [expanded, setExpanded] = useState(false);
  const relativeDay = getRelativeDay(outage.date, today);

  const isHidden = outage.place === PLACE_HIDDEN;
  const isLong = outage.place.length > LONG_PLACE_CHARS;

  return (
    <article className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <h5 className="flex items-center gap-2">
          <ClockIcon className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-semibold tabular-nums">
            {outage.timeFrom}–{outage.timeTo}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDuration(outage.timeFrom, outage.timeTo)}
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
            <p
              id={placeId}
              className={cn(
                "leading-relaxed break-words",
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
          <dd className="min-w-0 break-words">{outage.dispatchName}</dd>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <dt>
            <WrenchIcon className="mt-0.5 size-4" aria-hidden />
            <span className="sr-only">{t("workType")}</span>
          </dt>
          <dd className="flex flex-1 flex-wrap justify-between gap-x-3">
            <span>{tRepair(outage.repairType)}</span>
            <ExternalLink href={outage.sourceUrl} className="text-xs leading-5 font-normal">
              {t("source")}
              <span className="sr-only">{t("sourceDetails")}</span>
            </ExternalLink>
          </dd>
        </div>
      </dl>
    </article>
  );
}
