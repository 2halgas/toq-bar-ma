import { type z } from "zod";

import rawGeocache from "@/data/geocache.json";
import rawOutages from "@/data/outages.json";
import { AzhkOutagesFileSchema, type AzhkOutagesFile } from "@/lib/azhk/schema";
import { GeocacheSchema, type Geocache } from "@/lib/geo/geocache";

export const DATA_FILE_PATH = "data/outages.json";

export class OutagesDataError extends Error {
  constructor(
    message: string,
    readonly issues: readonly string[],
  ) {
    super(message);
    this.name = "OutagesDataError";
  }
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === "number") return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, "");
}

/** Adds the record id next to its index so a broken entry is easy to find in the JSON. */
function describeIssue(issue: z.core.$ZodIssue, raw: unknown): string {
  const [root, index] = issue.path;
  let where = formatPath(issue.path) || "(root)";

  if (root === "outages" && typeof index === "number" && isRecord(raw)) {
    const record = Array.isArray(raw.outages) ? raw.outages[index] : undefined;
    const id = isRecord(record) && typeof record.id === "string" ? record.id : undefined;
    if (id) where = `${where} (id "${id}")`;
  }

  return `${where}: ${issue.message}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Validates raw JSON; throws {@link OutagesDataError} listing every problem found. */
export function parseOutagesFile(raw: unknown, source = DATA_FILE_PATH): AzhkOutagesFile {
  const result = AzhkOutagesFileSchema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues.map((issue) => describeIssue(issue, raw));
  const message = [
    `${source} failed validation (${issues.length} ${issues.length === 1 ? "issue" : "issues"}):`,
    ...issues.map((line) => `  • ${line}`),
  ].join("\n");

  console.error(`\n[outages] ${message}\n`);
  throw new OutagesDataError(message, issues);
}

let cached: AzhkOutagesFile | undefined;

/** The bundled outage schedule, validated once per process (i.e. at build time for static pages). */
export function getOutagesData(): AzhkOutagesFile {
  cached ??= parseOutagesFile(rawOutages);
  return cached;
}

let cachedGeocache: Geocache | undefined;

/** Geocoded toponyms (data/geocache.json), validated once per process. */
export function getGeocache(): Geocache {
  if (!cachedGeocache) {
    const parsed = GeocacheSchema.safeParse(rawGeocache);
    if (!parsed.success) {
      const message = `data/geocache.json failed validation: ${parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`;
      console.error(`\n[geocache] ${message}\n`);
      throw new OutagesDataError(message, [message]);
    }
    cachedGeocache = parsed.data;
  }
  return cachedGeocache;
}
