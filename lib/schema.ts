import { z } from "zod";

/** Calendar date in `YYYY-MM-DD`; impossible dates like 2026-02-30 are rejected. */
export const IsoDateSchema = z.iso.date({ error: "Expected a real date in YYYY-MM-DD format" });

/** Wall-clock time in `HH:mm` (Asia/Almaty). */
export const TimeSchema = z.iso.time({ precision: -1, error: "Expected time in HH:mm format" });
