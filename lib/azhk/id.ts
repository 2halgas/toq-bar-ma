import { createHash } from "node:crypto";

/**
 * Stable 12-hex id from the fields that identify an outage. `place` must be the
 * redacted text: a hash of a personal name is still personal data.
 */
export function outageId(parts: {
  date: string;
  res: number;
  dispatchName: string;
  place: string;
}): string {
  const key = [parts.date, parts.res, parts.dispatchName.trim(), parts.place.trim()].join("␟");
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}
