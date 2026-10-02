import { createHash } from "node:crypto";

const SEPARATOR = "␟"; // ␟ can't appear in schedule text

/**
 * Stable 12-hex id from the fields that identify an outage. `place` must be the
 * redacted text: a hash of a personal name is still personal data.
 */
export function outageId(parts: {
  date: string;
  res: number;
  dispatchName: string;
  place: string;
  /** 2, 3, … when earlier rows already produced the same id; omitted for the first. */
  occurrence?: number;
}): string {
  const fields: (string | number)[] = [
    parts.date,
    parts.res,
    parts.dispatchName.trim(),
    parts.place.trim(),
  ];
  if (parts.occurrence !== undefined && parts.occurrence > 1) fields.push(parts.occurrence);
  return createHash("sha256").update(fields.join(SEPARATOR)).digest("hex").slice(0, 12);
}
