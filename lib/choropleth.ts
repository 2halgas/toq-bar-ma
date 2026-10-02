/** Number of shaded classes for districts that have outages (plus a neutral class for zero). */
export const SHADED_LEVELS = 4;

export type ChoroplethLevel = 0 | 1 | 2 | 3 | 4;

export interface ChoroplethBucket {
  level: ChoroplethLevel;
  /** Inclusive bounds. */
  min: number;
  max: number;
}

/**
 * Splits 1…maxCount into up to four equal-width buckets; zero always gets its own
 * neutral bucket. Small maxima get one bucket per value, so "1 outage" and
 * "2 outages" never share a colour when the whole range is tiny.
 *
 * @example buildBuckets(8) → 0 | 1–2 | 3–4 | 5–6 | 7–8
 */
export function buildBuckets(maxCount: number): ChoroplethBucket[] {
  const buckets: ChoroplethBucket[] = [{ level: 0, min: 0, max: 0 }];
  if (maxCount < 1) return buckets;

  const step = Math.ceil(maxCount / SHADED_LEVELS);
  for (let level = 1; level <= SHADED_LEVELS; level++) {
    const min = (level - 1) * step + 1;
    if (min > maxCount) break;
    buckets.push({ level: level as ChoroplethLevel, min, max: Math.min(level * step, maxCount) });
  }

  // With fewer buckets than levels, spread them over the palette so the top bucket is the darkest.
  const shaded = buckets.length - 1;
  if (shaded < SHADED_LEVELS) {
    buckets.forEach((bucket, index) => {
      if (index > 0) {
        bucket.level = Math.round((index / shaded) * SHADED_LEVELS) as ChoroplethLevel;
      }
    });
  }
  return buckets;
}

export function getLevel(count: number, buckets: readonly ChoroplethBucket[]): ChoroplethLevel {
  return buckets.find((bucket) => count >= bucket.min && count <= bucket.max)?.level ?? 0;
}

export function formatBucketRange(bucket: ChoroplethBucket): string {
  return bucket.min === bucket.max ? String(bucket.min) : `${bucket.min}–${bucket.max}`;
}

/**
 * Colours live in CSS (`--choropleth-0…4` in app/globals.css) so they follow the
 * theme without re-rendering and server/client markup never differs.
 */
export function choroplethColorVar(level: ChoroplethLevel): string {
  return `var(--choropleth-${level})`;
}

/** Class applied to a district polygon; globals.css maps it to the level's fill. */
export function choroplethClassName(level: ChoroplethLevel): string {
  return `choropleth-level-${level}`;
}
