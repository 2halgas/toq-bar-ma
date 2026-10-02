import { IsoDateSchema } from "@/lib/schema";

import { type RepairType } from "@/lib/azhk/schema";

/** «28.09.2026», «28.09.2026 г.», «28.09.2026г» → "2026-09-28"; null if not a real date. */
export function parseDate(cell: string): string | null {
  const match = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(?:г\.?)?\s*$/u.exec(cell);
  if (!match) return null;
  const [, day = "", month = "", year = ""] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return IsoDateSchema.safeParse(iso).success ? iso : null;
}

/** «09.00 -17.00», «08.00-17.00», «9:00–13:00» → { from: "09:00", to: "17:00" }. */
export function parseTimeRange(cell: string): { from: string; to: string } | null {
  const match = /^\s*(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*$/u.exec(cell);
  if (!match) return null;
  const [, h1 = "", m1 = "", h2 = "", m2 = ""] = match;
  const valid = (h: string, m: string) => Number(h) <= 23 && Number(m) <= 59;
  if (!valid(h1, m1) || !valid(h2, m2)) return null;
  return { from: `${h1.padStart(2, "0")}:${m1}`, to: `${h2.padStart(2, "0")}:${m2}` };
}

/** «РЭС-3», «РЭС 3», «РЭС–3» → 3. */
export function parseRes(cell: string): number | null {
  const match = /^\s*РЭС\s*[-–]?\s*(\d+)\s*$/iu.exec(cell);
  return match?.[1] ? Number(match[1]) : null;
}

/** Unique substation ids in order of appearance: «ТП-1307 … (между ТП-1307-ТП-1329)» → ["ТП-1307", "ТП-1329"]. */
export function extractSubstations(dispatchName: string): string[] {
  const ids = [...dispatchName.matchAll(/(?<![\p{L}])ТП\s?[-–]?\s?(\d+)/gu)].map(
    (m) => `ТП-${m[1]}`,
  );
  return [...new Set(ids)];
}

/**
 * Repair types by the start of the normalized source text, so typos and word
 * forms seen in real schedules («текуший», «подряд», «подрядным») still map.
 * Known non-standard work («аварийный», «замена ввода», tree trimming) maps to
 * "other" quietly; anything else maps to "other" and is reported by the fetch
 * script so the rules can be extended.
 */
const REPAIR_TYPE_RULES: [RegExp, RepairType][] = [
  [/^текущ|^текуш/u, "current_repair"],
  [/^капитальн/u, "capital_repair"],
  [/^подряд/u, "contractor_works"],
  [/^устранени\p{L}*\s+дефект/u, "defect_elimination"],
  [/^(?:аварийн|замена ввода|подрезка деревьев)/u, "other"],
];

export function mapRepairType(raw: string): { type: RepairType; known: boolean } {
  const text = raw.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const rule = REPAIR_TYPE_RULES.find(([pattern]) => pattern.test(text));
  return rule ? { type: rule[1], known: true } : { type: "other", known: false };
}
