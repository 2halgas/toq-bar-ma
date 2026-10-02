import { normalizePlace } from "@/lib/azhk/normalize";
import { type AzhkOutage } from "@/lib/azhk/schema";

let sequence = 0;

/** A valid outage for tests; `placeNormalized` follows `place` unless overridden. */
export function makeOutage(overrides: Partial<AzhkOutage> = {}): AzhkOutage {
  sequence += 1;
  const place = overrides.place ?? "мкр. Айгерим-1, ул. Азаттык";
  return {
    id: sequence.toString(16).padStart(12, "0"),
    res: 1,
    date: "2026-10-02",
    timeFrom: "08:00",
    timeTo: "17:00",
    dispatchName: "РУ-0,4 кВ ТП-1539",
    substations: ["ТП-1539"],
    repairType: "current_repair",
    repairTypeRaw: "текущий",
    sourceUrl: "https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics/105/5301",
    weekStart: "2026-09-28",
    weekEnd: "2026-10-02",
    ...overrides,
    place,
    placeNormalized: overrides.placeNormalized ?? normalizePlace(place),
  };
}
