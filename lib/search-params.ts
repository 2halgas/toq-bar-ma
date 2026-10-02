import { DEFAULT_FILTERS, type DateFilter, type OutageFilters } from "@/lib/filter";
import { IsoDateSchema } from "@/lib/schema";

/** Query-string keys, kept short for shareable links: `?q=айгерим&date=tomorrow&res=1`. */
export const SEARCH_PARAM_KEYS = {
  query: "q",
  date: "date",
  res: "res",
} as const;

export const MAX_QUERY_LENGTH = 100;

/** Anything with a URLSearchParams-like `get` — covers ReadonlyURLSearchParams from next/navigation. */
export interface SearchParamsReader {
  get(name: string): string | null;
}

const DATE_PRESETS = ["today", "tomorrow", "week"] as const;
type DatePreset = (typeof DATE_PRESETS)[number];

function isDatePreset(value: string): value is DatePreset {
  return (DATE_PRESETS as readonly string[]).includes(value);
}

function parseDateFilter(value: string | null): DateFilter {
  if (value === null) return DEFAULT_FILTERS.date;
  if (isDatePreset(value)) return { kind: value };
  const date = IsoDateSchema.safeParse(value);
  return date.success ? { kind: "date", date: date.data } : DEFAULT_FILTERS.date;
}

/** «3» → 3; anything that isn't a small positive integer → null. */
function parseResParam(value: string | null): number | null {
  if (value === null || !/^\d{1,2}$/.test(value)) return null;
  const res = Number(value);
  return res > 0 ? res : null;
}

function serializeDateFilter(filter: DateFilter): string {
  return filter.kind === "date" ? filter.date : filter.kind;
}

/** Reads filters from the URL; unknown or malformed values fall back to defaults instead of failing. */
export function parseFilters(params: SearchParamsReader): OutageFilters {
  return {
    query: (params.get(SEARCH_PARAM_KEYS.query) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    date: parseDateFilter(params.get(SEARCH_PARAM_KEYS.date)),
    res: parseResParam(params.get(SEARCH_PARAM_KEYS.res)),
  };
}

/** Writes filters to search params, omitting defaults so that links stay short and canonical. */
export function serializeFilters(filters: OutageFilters): URLSearchParams {
  const params = new URLSearchParams();

  const query = filters.query.trim();
  if (query) params.set(SEARCH_PARAM_KEYS.query, query);

  const date = serializeDateFilter(filters.date);
  if (date !== serializeDateFilter(DEFAULT_FILTERS.date)) params.set(SEARCH_PARAM_KEYS.date, date);

  if (filters.res !== null) params.set(SEARCH_PARAM_KEYS.res, String(filters.res));

  return params;
}

/** `"?q=…"`, or `""` when every filter is at its default — ready to append to a pathname. */
export function toQueryString(filters: OutageFilters): string {
  const query = serializeFilters(filters).toString();
  return query ? `?${query}` : "";
}
