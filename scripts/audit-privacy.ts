/**
 * Fails if published or cached data still contains name-like patterns.
 *
 *   pnpm data:audit
 *
 * Prints counts only, so CI logs never contain the names it is looking for.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { auditPrivacy } from "@/lib/azhk/privacy-audit";

const FILES = [
  "data/azhk-outages.json",
  ...(existsSync("data/raw") ? readdirSync("data/raw").map((name) => join("data/raw", name)) : []),
].filter((path) => existsSync(path));

let failed = false;
for (const path of FILES) {
  const findings = Object.entries(auditPrivacy(readFileSync(path, "utf8"))).filter(
    ([, n]) => n > 0,
  );
  if (findings.length === 0) {
    console.log(`✓ ${path}`);
  } else {
    failed = true;
    console.error(`✗ ${path}: ${findings.map(([check, n]) => `${check} ×${n}`).join(", ")}`);
  }
}

if (failed) {
  console.error(
    "Possible personal data found. Extend lib/azhk/redact.ts, then run data:fetch --force.",
  );
  process.exit(1);
}
