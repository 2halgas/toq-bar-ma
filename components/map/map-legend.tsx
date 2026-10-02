import { choroplethColorVar, formatBucketRange, type ChoroplethBucket } from "@/lib/choropleth";

interface MapLegendProps {
  buckets: ChoroplethBucket[];
  periodLabel: string;
}

export function MapLegend({ buckets, periodLabel }: MapLegendProps) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-xs font-medium text-muted-foreground">
        Отключений в районе {periodLabel}
      </figcaption>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {buckets.map((bucket) => (
          <li key={bucket.level} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-sm ring-1 ring-foreground/15"
              style={{ backgroundColor: choroplethColorVar(bucket.level) }}
              aria-hidden
            />
            {bucket.level === 0 ? "нет" : formatBucketRange(bucket)}
          </li>
        ))}
      </ul>
    </figure>
  );
}
