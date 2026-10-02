import { z } from "zod";

/**
 * Almaty's eight administrative districts. Slugs are used in data, URLs and
 * GeoJSON so that they stay stable across translations; labels live below.
 */
export const DISTRICT_IDS = [
  "alatau",
  "almaly",
  "auezov",
  "bostandyk",
  "zhetysu",
  "medeu",
  "nauryzbay",
  "turksib",
] as const;

export const DistrictSchema = z.enum(DISTRICT_IDS);
export type District = z.infer<typeof DistrictSchema>;

export const DISTRICT_LABELS: Record<District, string> = {
  alatau: "Алатауский",
  almaly: "Алмалинский",
  auezov: "Ауэзовский",
  bostandyk: "Бостандыкский",
  zhetysu: "Жетысуский",
  medeu: "Медеуский",
  nauryzbay: "Наурызбайский",
  turksib: "Турксибский",
};

export const REASON_IDS = [
  "current_repair",
  "capital_repair",
  "contractor_works",
  "defect_elimination",
  "other",
] as const;

export const ReasonSchema = z.enum(REASON_IDS);
export type Reason = z.infer<typeof ReasonSchema>;

export const REASON_LABELS: Record<Reason, string> = {
  current_repair: "Текущий ремонт",
  capital_repair: "Капитальный ремонт",
  contractor_works: "Подрядные работы",
  defect_elimination: "Устранение дефектов",
  other: "Другое",
};

/** Calendar date in `YYYY-MM-DD`; impossible dates like 2026-02-30 are rejected. */
export const IsoDateSchema = z.iso.date({ error: "Expected a real date in YYYY-MM-DD format" });

/** Wall-clock time in `HH:mm` (Asia/Almaty). */
export const TimeSchema = z.iso.time({ precision: -1, error: "Expected time in HH:mm format" });

export const OutageSchema = z
  .object({
    id: z.string().trim().min(1, "Must not be empty"),
    district: DistrictSchema,
    street: z.string().trim().min(1, "Must not be empty"),
    /** House numbers exactly as written in the source schedule, e.g. "1–15, 21". */
    houses: z.string().trim().min(1, "Must not be empty"),
    date: IsoDateSchema,
    timeFrom: TimeSchema,
    timeTo: TimeSchema,
    reason: ReasonSchema,
    sourceUrl: z.url({ protocol: /^https?$/, error: "Expected an http(s) URL" }),
  })
  .refine((outage) => outage.timeFrom < outage.timeTo, {
    path: ["timeTo"],
    error: "Must be later than timeFrom",
  });

export type Outage = z.infer<typeof OutageSchema>;

export const OutagesFileSchema = z
  .object({
    /** True while the file contains generated demo records instead of the real AZhK schedule. */
    isDemo: z.boolean(),
    /** When the data was last refreshed (ISO 8601 with offset). */
    updatedAt: z.iso.datetime({ offset: true, error: "Expected an ISO 8601 datetime" }),
    /** Page with the published schedules, shown in the footer. */
    sourceUrl: z.url({ protocol: /^https?$/, error: "Expected an http(s) URL" }),
    outages: z.array(OutageSchema),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.outages.forEach((outage, index) => {
      if (seen.has(outage.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["outages", index, "id"],
          message: `Duplicate id "${outage.id}"`,
        });
      }
      seen.add(outage.id);
    });
  });

export type OutagesFile = z.infer<typeof OutagesFileSchema>;
