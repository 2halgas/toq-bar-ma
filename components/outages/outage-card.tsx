import { ClockIcon, HouseIcon, WrenchIcon } from "lucide-react";

import { ExternalLink } from "@/components/layout/external-link";
import { Badge } from "@/components/ui/badge";
import { formatDuration, getRelativeDay, type RelativeDay } from "@/lib/dates";
import { REASON_LABELS, type Outage } from "@/lib/schema";

const RELATIVE_DAY_BADGES: Record<RelativeDay, { label: string; className: string }> = {
  today: { label: "Сегодня", className: "bg-brand text-neutral-950" },
  tomorrow: { label: "Завтра", className: "bg-secondary text-secondary-foreground" },
};

interface OutageCardProps {
  outage: Outage;
  today: string;
}

export function OutageCard({ outage, today }: OutageCardProps) {
  const relativeDay = getRelativeDay(outage.date, today);
  const badge = relativeDay && RELATIVE_DAY_BADGES[relativeDay];

  return (
    <article className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <h5 className="leading-snug font-semibold">{outage.street}</h5>
        {badge && <Badge className={badge.className}>{badge.label}</Badge>}
      </div>

      <dl className="mt-2.5 grid gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt>
            <HouseIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Дома</span>
          </dt>
          <dd>{outage.houses}</dd>
        </div>
        <div className="flex gap-2">
          <dt>
            <ClockIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Время</span>
          </dt>
          <dd>
            <span className="font-medium tabular-nums">
              {outage.timeFrom}–{outage.timeTo}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {formatDuration(outage.timeFrom, outage.timeTo)}
            </span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt>
            <WrenchIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Причина</span>
          </dt>
          <dd className="flex flex-1 flex-wrap justify-between gap-x-3 text-muted-foreground">
            <span>{REASON_LABELS[outage.reason]}</span>
            <ExternalLink href={outage.sourceUrl} className="text-xs leading-5 font-normal">
              Источник<span className="sr-only">: график АЖК для {outage.street}</span>
            </ExternalLink>
          </dd>
        </div>
      </dl>
    </article>
  );
}
