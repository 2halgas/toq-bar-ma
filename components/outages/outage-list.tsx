import { OutageCard } from "@/components/outages/outage-card";
import { formatDayHeading } from "@/lib/dates";
import { groupOutages } from "@/lib/filter";
import { OUTAGE_FORMS, pluralize } from "@/lib/plural";
import { DISTRICT_LABELS, type Outage } from "@/lib/schema";

interface OutageListProps {
  outages: Outage[];
  today: string;
}

export function OutageList({ outages, today }: OutageListProps) {
  const days = groupOutages(outages);

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const headingId = `day-${day.date}`;
        const count = day.districts.reduce((sum, group) => sum + group.outages.length, 0);

        return (
          <section key={day.date} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="sticky top-0 z-10 flex items-baseline justify-between gap-2 border-b bg-background/95 py-2 backdrop-blur supports-backdrop-filter:bg-background/80"
            >
              <span className="font-semibold">{formatDayHeading(day.date)}</span>
              <span className="sr-only">, </span>
              <span className="text-sm font-normal text-muted-foreground">
                {count} {pluralize(count, OUTAGE_FORMS)}
              </span>
            </h3>

            <div className="mt-3 space-y-4">
              {day.districts.map((group) => (
                <div key={group.district}>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    {DISTRICT_LABELS[group.district]} район
                  </h4>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
