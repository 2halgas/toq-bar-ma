import { z } from "zod";

import { IsoDateSchema, TimeSchema } from "@/lib/schema";

/**
 * Data model for outages parsed from the official AZhK schedules
 * (https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics).
 *
 * Privacy: the source sometimes names private individuals and sole proprietors.
 * Nothing here ever holds the raw text — `place` is already redacted by
 * `redactPersonalNames`, and `id` is hashed from the redacted text.
 */

export const REPAIR_TYPE_IDS = [
  "current_repair",
  "capital_repair",
  "contractor_works",
  "defect_elimination",
  "other",
] as const;

export const RepairTypeSchema = z.enum(REPAIR_TYPE_IDS);
export type RepairType = z.infer<typeof RepairTypeSchema>;

/** Substation id as written in dispatch names, normalized to `ТП-1234`. */
export const SubstationSchema = z.string().regex(/^ТП-\d+$/, "Expected ТП-<number>");

const NonEmpty = z.string().trim().min(1, "Must not be empty");

export const AzhkOutageSchema = z
  .object({
    /** Stable hash of date + РЭС + dispatch name + redacted place. */
    id: z.string().regex(/^[0-9a-f]{12}$/, "Expected 12 hex chars"),
    /** District power network unit number: 3 for «РЭС-3». */
    res: z.number().int().positive(),
    date: IsoDateSchema,
    timeFrom: TimeSchema,
    timeTo: TimeSchema,
    /** Equipment being switched off, e.g. «ВЛ-0,4 кВ ТП-1315 выход "Запад"». */
    dispatchName: NonEmpty,
    substations: z.array(SubstationSchema),
    repairType: RepairTypeSchema,
    /** Repair type as written in the source (typos included), for auditing the mapping. */
    repairTypeRaw: NonEmpty,
    /** Affected addresses with personal names redacted — safe to display. */
    place: NonEmpty,
    /** `normalizePlace(place)`: what street search matches against. */
    placeNormalized: z.string(),
    sourceUrl: z.url({ protocol: /^https?$/ }),
    weekStart: IsoDateSchema,
    weekEnd: IsoDateSchema,
  })
  .refine((outage) => outage.timeFrom < outage.timeTo, {
    path: ["timeTo"],
    error: "Must be later than timeFrom",
  });

export type AzhkOutage = z.infer<typeof AzhkOutageSchema>;

/** Shown instead of a place whose text still looked like it contained a name after redaction. */
export const PLACE_HIDDEN = "Адрес скрыт — см. график на сайте АЖК";

export const AzhkOutagesFileSchema = z
  .object({
    source: z.literal("azhk"),
    /** Schedule title as published, e.g. «город Алматы с 28.09.2026 года по 02.10.2026 года». */
    title: NonEmpty,
    sourceUrl: z.url({ protocol: /^https?$/ }),
    weekStart: IsoDateSchema,
    weekEnd: IsoDateSchema,
    /** When the outage list last changed (not when the script last ran). */
    updatedAt: z.iso.datetime({ offset: true }),
    outages: z.array(AzhkOutageSchema),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.outages.forEach((outage, index) => {
      if (seen.has(outage.id)) {
        ctx.addIssue({ code: "custom", path: ["outages", index, "id"], message: "Duplicate id" });
      }
      seen.add(outage.id);
    });
  });

export type AzhkOutagesFile = z.infer<typeof AzhkOutagesFileSchema>;
