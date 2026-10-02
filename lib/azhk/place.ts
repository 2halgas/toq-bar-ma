import { fixMisencodedChars, normalizePlace } from "@/lib/azhk/normalize";
import {
  findPersonalDataHints,
  redactPersonalNames,
  stripRedactionPlaceholders,
} from "@/lib/azhk/redact";

export interface PreparedPlace {
  /** Redacted, display-safe text. */
  place: string;
  /** Search index built from `place`, without redaction placeholders. */
  placeNormalized: string;
  /** Reasons the redacted text may still contain a name (never the text itself). */
  privacyHints: string[];
}

/** The only way raw «Место отключения» text enters the app: redact first, then index. */
export function preparePlace(rawCell: string): PreparedPlace {
  const place = redactPersonalNames(fixMisencodedChars(rawCell))
    .replace(/\s+/g, " ")
    .replace(/[\s,;]+$/, "")
    .trim();

  return {
    place,
    placeNormalized: normalizePlace(stripRedactionPlaceholders(place)),
    privacyHints: findPersonalDataHints(place),
  };
}
