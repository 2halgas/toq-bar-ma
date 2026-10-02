import { describe, expect, it } from "vitest";

import { buildBuckets, formatBucketRange, getLevel } from "@/lib/choropleth";

const ranges = (max: number) =>
  buildBuckets(max).map((bucket) => `${formatBucketRange(bucket)}@${bucket.level}`);

describe("buildBuckets", () => {
  it("only has the neutral bucket when there are no outages", () => {
    expect(ranges(0)).toEqual(["0@0"]);
  });

  it("uses one bucket per value for small maxima, spread to the darkest shade", () => {
    expect(ranges(1)).toEqual(["0@0", "1@4"]);
    expect(ranges(2)).toEqual(["0@0", "1@2", "2@4"]);
    expect(ranges(3)).toEqual(["0@0", "1@1", "2@3", "3@4"]);
    expect(ranges(4)).toEqual(["0@0", "1@1", "2@2", "3@3", "4@4"]);
  });

  it("splits larger maxima into four equal-width buckets", () => {
    expect(ranges(8)).toEqual(["0@0", "1–2@1", "3–4@2", "5–6@3", "7–8@4"]);
    expect(ranges(10)).toEqual(["0@0", "1–3@1", "4–6@2", "7–9@3", "10@4"]);
  });

  it("covers every count from 0 to max exactly once", () => {
    for (const max of [1, 5, 7, 13, 40]) {
      const buckets = buildBuckets(max);
      for (let count = 0; count <= max; count++) {
        expect(buckets.filter((b) => count >= b.min && count <= b.max)).toHaveLength(1);
      }
    }
  });
});

describe("getLevel", () => {
  const buckets = buildBuckets(8);

  it("maps counts to levels", () => {
    expect(getLevel(0, buckets)).toBe(0);
    expect(getLevel(1, buckets)).toBe(1);
    expect(getLevel(4, buckets)).toBe(2);
    expect(getLevel(8, buckets)).toBe(4);
  });

  it("falls back to the neutral level for out-of-range counts", () => {
    expect(getLevel(99, buckets)).toBe(0);
  });
});
