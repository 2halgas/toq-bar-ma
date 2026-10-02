import { useLocale, useTranslations } from "next-intl";

import { OutageCard } from "@/components/outages/outage-card";
import { formatDayHeading } from "@/lib/dates";
import { groupOutages } from "@/lib/filter";
import { type AzhkOutage } from "@/lib/azhk/schema";

interface OutageListProps {
  outages: AzhkOutage[];
  today: string;
}

export function OutageList({ outages, today }: OutageListProps) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const days = groupOutages(outages);

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const headingId = `day-${day.date}`;
        const count = day.groups.reduce((sum, group) => sum + group.outages.length, 0);

        return (
          <section key={day.date} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="sticky top-(--sticky-offset) z-10 flex items-baseline justify-between gap-2 border-b bg-background py-2"
            >
              <span className="font-semibold">{formatDayHeading(day.date, locale)}</span>
              <span className="sr-only">, </span>
              <span className="text-sm font-normal text-muted-foreground">
                {t("outages", { count })}
              </span>
            </h3>

            <div className="mt-3 space-y-4">
              {day.groups.map((group) => (
                <div key={group.res}>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    {t("res", { number: group.res })}
                  </h4>
                  {/* Two columns only while the list spans the screen; next to the map it's ≤ 28rem. */}
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {group.outages.map((outage) => (
                      <li key={outage.id}>
                        <OutageCard outage={outage} today={today} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
