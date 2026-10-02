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
    const dates = data.outages.map((outage) => outage.date).sort();
    const today = getAlmatyToday();

    console.log(
      `✓ ${DATA_FILE_PATH}: ${data.outages.length} outages, ${dates[0] ?? "—"} … ${dates.at(-1) ?? "—"}${data.isDemo ? " (demo)" : ""}`,
    );
    if ((dates.at(-1) ?? "") < today) {
      console.warn(`⚠ All outages are in the past (today is ${today}). Time to refresh the data.`);
    }
  } catch (error) {
    // parseOutagesFile has already printed the details.
    if (error instanceof OutagesDataError) process.exit(1);
    throw error;
  }
}

main();
