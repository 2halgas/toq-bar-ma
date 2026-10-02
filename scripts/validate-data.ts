/**
 * Validates data/outages.json without building the app.
 *
 *   pnpm data:validate
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DATA_FILE_PATH, OutagesDataError, parseOutagesFile } from "@/lib/data";
import { getAlmatyToday } from "@/lib/dates";

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(resolve(process.cwd(), DATA_FILE_PATH), "utf8"));

  try {
    const data = parseOutagesFile(raw);
    console.log(`✓ ${DATA_FILE_PATH}: ${data.outages.length} outages — ${data.title}`);

    const today = getAlmatyToday();
    if (data.weekEnd < today) {
      console.warn(
        `⚠ The schedule ended on ${data.weekEnd} (today is ${today}). Run pnpm data:fetch.`,
      );
    }
  } catch (error) {
    // parseOutagesFile has already printed the details.
    if (error instanceof OutagesDataError) process.exit(1);
    throw error;
  }
}

main();
