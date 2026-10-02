/**
 * Fetches the latest «город Алматы» schedule from AZhK and writes the parsed outages.
 *
 *   pnpm data:fetch            # latest schedule; reuses its cached copy in data/raw/ if present
 *   pnpm data:fetch --force    # re-download the schedule page even if cached
 *
 * Politeness: descriptive User-Agent (set AZHK_CONTACT to add a contact), at most one
 * request per second, and the schedule page is downloaded once per week.
 *
 * Privacy: personal names are redacted before anything touches the disk — the cached
 * HTML in data/raw/ is a redacted copy, and logs only ever show row numbers and reasons.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { AZHK_LIST_URL, parseScheduleList, pickLatestSchedule } from "@/lib/azhk/parse-list";
import { PLACE_HIDDEN, parseScheduleTable, sanitizeScheduleHtml } from "@/lib/azhk/parse-table";
import { AzhkOutagesFileSchema, type AzhkOutagesFile } from "@/lib/azhk/schema";
import { siteConfig } from "@/lib/site";

// Becomes data/outages.json once the UI switches to AZhK data (next step).
const OUTPUT_PATH = "data/azhk-outages.json";
const RAW_DIR = "data/raw";
const MIN_REQUEST_INTERVAL_MS = 1_100;
const REQUEST_TIMEOUT_MS = 30_000;

const USER_AGENT = `toq-bar-ma/0.1 (unofficial Almaty planned outages map; ${
  process.env.AZHK_CONTACT ?? siteConfig.githubUrl
})`;

let lastRequestAt = 0;

async function politeFetch(url: string): Promise<string> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((done) => setTimeout(done, wait));
  lastRequestAt = Date.now();

  console.log(`GET ${url}`);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status} ${response.statusText}`);
  return response.text();
}

function readExisting(path: string): AzhkOutagesFile | undefined {
  if (!existsSync(path)) return undefined;
  const parsed = AzhkOutagesFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  return parsed.success ? parsed.data : undefined;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { force: { type: "boolean", default: false } } });

  const links = parseScheduleList(await politeFetch(AZHK_LIST_URL));
  const latest = pickLatestSchedule(links);
  if (!latest) throw new Error(`No «город Алматы» schedules found on ${AZHK_LIST_URL}`);
  console.log(`Latest: ${latest.title} (${links.length} city schedules listed)`);

  // Start and end: two schedules can share a start date (e.g. 31.08–04.09 and 31.08–06.09).
  const rawName = `${latest.weekStart}_${latest.weekEnd}.html`;
  const rawPath = resolve(process.cwd(), RAW_DIR, rawName);
  if (values.force || !existsSync(rawPath)) {
    const html = await politeFetch(latest.url);
    mkdirSync(dirname(rawPath), { recursive: true });
    // Only the redacted copy is ever written.
    writeFileSync(
      rawPath,
      sanitizeScheduleHtml(html, { title: latest.title, sourceUrl: latest.url }),
    );
    console.log(`Saved redacted copy to ${RAW_DIR}/${rawName}`);
  } else {
    console.log(`Using cached ${RAW_DIR}/${rawName} (pass --force to re-download)`);
  }

  const result = parseScheduleTable(readFileSync(rawPath, "utf8"), {
    sourceUrl: latest.url,
    weekStart: latest.weekStart,
    weekEnd: latest.weekEnd,
  });

  console.log(
    `Rows read: ${result.rowsRead} → outages: ${result.outages.length}, ` +
      `duplicates removed: ${result.duplicatesRemoved}, invalid: ${result.invalid.length}, ` +
      `places hidden: ${result.hiddenPlaces.length}`,
  );
  for (const issue of result.invalid) console.warn(`  ✗ table row ${issue.row}: ${issue.message}`);
  for (const issue of result.hiddenPlaces) {
    console.warn(
      `  ⚠ table row ${issue.row}: place replaced with «${PLACE_HIDDEN}» (${issue.message})`,
    );
  }
  if (result.unknownRepairTypes.length > 0) {
    console.warn(
      `  ⚠ unknown repair types mapped to "other": ${result.unknownRepairTypes.join(", ")}`,
    );
  }

  if (result.outages.length === 0) {
    throw new Error("No outages parsed — the page structure may have changed.");
  }

  const outputPath = resolve(process.cwd(), OUTPUT_PATH);
  const existing = readExisting(outputPath);
  const unchanged =
    existing?.sourceUrl === latest.url &&
    JSON.stringify(existing.outages) === JSON.stringify(result.outages);
  if (unchanged) {
    console.log(`No changes in ${OUTPUT_PATH}.`);
    return;
  }

  const file = AzhkOutagesFileSchema.parse({
    source: "azhk",
    title: latest.title,
    sourceUrl: latest.url,
    weekStart: latest.weekStart,
    weekEnd: latest.weekEnd,
    updatedAt: new Date().toISOString(),
    outages: result.outages,
  });
  writeFileSync(outputPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Wrote ${file.outages.length} outages to ${OUTPUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
