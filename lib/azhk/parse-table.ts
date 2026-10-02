import * as cheerio from "cheerio";
import { type AnyNode, type Element } from "domhandler";

import { outageId } from "@/lib/azhk/id";
import { fixMisencodedChars } from "@/lib/azhk/normalize";
import { preparePlace } from "@/lib/azhk/place";
import { redactCellForStorage, redactPersonalNames } from "@/lib/azhk/redact";
import { AzhkOutageSchema, type AzhkOutage } from "@/lib/azhk/schema";
import {
  extractSubstations,
  mapRepairType,
  parseDate,
  parseRes,
  parseTimeRange,
} from "@/lib/azhk/values";

/** Shown instead of a place whose text still looked like it contained a name after redaction. */
export const PLACE_HIDDEN = "Адрес скрыт — см. график на сайте АЖК";

type Column = "res" | "date" | "time" | "dispatch" | "repair" | "place";

const HEADER_PATTERNS: Record<Column, RegExp> = {
  res: /подразделение|рэс/iu,
  date: /дата/iu,
  time: /время/iu,
  dispatch: /диспетчер/iu,
  repair: /вид\s+ремонта/iu,
  place: /место/iu,
};

/** Column order of every AZhK schedule so far; used if the header can't be read. */
const DEFAULT_COLUMNS: Record<Column, number> = {
  res: 0,
  date: 1,
  time: 2,
  dispatch: 3,
  repair: 4,
  place: 5,
};

// ---------------------------------------------------------------------------
// HTML → grid

/** Cell text with line breaks and block boundaries kept as spaces, whitespace collapsed. */
function cellText($: cheerio.CheerioAPI, cell: AnyNode): string {
  const html = ($(cell).html() ?? "").replace(/<(?:br|\/p|\/div|\/li)\b[^>]*>/giu, " ");
  return cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim();
}

function rowsOf($: cheerio.CheerioAPI, table: Element) {
  return $(table)
    .find("tr")
    .filter((_, tr) => $(tr).closest("table").is(table));
}

/**
 * Expands `rowspan`/`colspan` into a full grid, so every row has its value in
 * every column. Merged cells in AZhK tables (one «РЭС-1» spanning 19 rows) shift
 * the remaining cells left — filling down by column index alone gets them wrong.
 */
export function expandTable($: cheerio.CheerioAPI, table: Element): string[][] {
  const grid: string[][] = [];

  rowsOf($, table).each((rowIndex, tr) => {
    const row = (grid[rowIndex] ??= []);
    let column = 0;

    $(tr)
      .children("td, th")
      .each((_, cell) => {
        while (row[column] !== undefined) column++;
        const rowSpan = Math.max(1, Number.parseInt($(cell).attr("rowspan") ?? "1", 10) || 1);
        const colSpan = Math.max(1, Number.parseInt($(cell).attr("colspan") ?? "1", 10) || 1);
        const text = cellText($, cell);

        for (let dr = 0; dr < rowSpan; dr++) {
          const target = (grid[rowIndex + dr] ??= []);
          for (let dc = 0; dc < colSpan; dc++) target[column + dc] = text;
        }
        column += colSpan;
      });
  });

  // Fill holes left by malformed spans.
  return grid.map((row) => Array.from(row, (cell) => cell ?? ""));
}

/** The schedule table: the one whose header mentions «Подразделение». */
function findScheduleTable($: cheerio.CheerioAPI): Element | undefined {
  const tables = $("table").toArray();
  return (
    tables.find((table) => /подразделение/iu.test($(table).text())) ??
    tables.sort((a, b) => $(b).find("tr").length - $(a).find("tr").length)[0]
  );
}

// ---------------------------------------------------------------------------
// Privacy: what we keep on disk

/**
 * Reduces a schedule page to its title and table, with personal names redacted
 * in every cell. This — never the original page — is what gets cached in
 * data/raw/, so names aren't stored anywhere, even locally.
 */
export function sanitizeScheduleHtml(
  html: string,
  meta: { title: string; sourceUrl: string },
): string {
  const $ = cheerio.load(html);
  const table = findScheduleTable($);
  if (!table) throw new Error("No table found on the schedule page");

  const $table = $(table);
  $table.find("script, style, img, a").each((_, element) => {
    $(element).replaceWith($(element).text());
  });
  $table.find("td, th").each((_, cell) => {
    const text = redactCellForStorage(fixMisencodedChars(cellText($, cell)), PLACE_HIDDEN);
    const attributes = ["rowspan", "colspan"]
      .map((name) => [name, $(cell).attr(name)] as const)
      .filter(([, value]) => value !== undefined);
    const replacement = $(`<${cell.tagName}></${cell.tagName}>`).text(text);
    for (const [name, value] of attributes) replacement.attr(name, value);
    $(cell).replaceWith(replacement);
  });
  // Drop styling noise; keep only structure that matters for parsing.
  $table.find("*").addBack().removeAttr("style").removeAttr("class").removeAttr("width");

  const escape = (text: string) => cheerio.load("<p></p>")("p").text(text).html() ?? "";
  return [
    "<!doctype html>",
    '<html lang="ru"><head><meta charset="utf-8">',
    `<title>${escape(meta.title)}</title>`,
    `<meta name="source" content="${escape(meta.sourceUrl)}">`,
    "<!-- Redacted copy: personal names removed by toq-bar-ma before saving. -->",
    "</head><body>",
    $.html(table),
    "</body></html>",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Grid → outages

export interface RowIssue {
  /** 1-based row number in the HTML table, for finding it on the AZhK page. */
  row: number;
  /** Reason only — never the place text. */
  message: string;
}

export interface ParseResult {
  outages: AzhkOutage[];
  /** Rows that couldn't be turned into a valid outage. */
  invalid: RowIssue[];
  /** Rows whose place was replaced by {@link PLACE_HIDDEN}. */
  hiddenPlaces: RowIssue[];
  /** Repair types not in the dictionary (mapped to "other"); safe to log — no personal data. */
  unknownRepairTypes: string[];
  duplicatesRemoved: number;
  rowsRead: number;
}

function detectColumns(row: string[]): Record<Column, number> | null {
  if (!row.some((cell) => /подразделение/iu.test(cell))) return null;
  const columns = { ...DEFAULT_COLUMNS };
  for (const key of Object.keys(HEADER_PATTERNS) as Column[]) {
    const index = row.findIndex((cell) => HEADER_PATTERNS[key].test(cell));
    if (index >= 0) columns[key] = index;
  }
  return columns;
}

const isLegendStart = (row: string[]) => row.some((cell) => /^сокращени/iu.test(cell));

export function parseScheduleTable(
  html: string,
  context: { sourceUrl: string; weekStart: string; weekEnd: string },
): ParseResult {
  const $ = cheerio.load(html);
  const table = findScheduleTable($);
  if (!table) throw new Error("No table found on the schedule page");

  const grid = expandTable($, table);
  const result: ParseResult = {
    outages: [],
    invalid: [],
    hiddenPlaces: [],
    unknownRepairTypes: [],
    duplicatesRemoved: 0,
    rowsRead: 0,
  };

  let columns: Record<Column, number> | null = null;
  // Last non-empty values, carried down for sources that leave merged cells blank instead of using rowspan.
  const carried = { res: "", date: "", time: "" };
  const seen = new Set<string>();
  const usedIds = new Set<string>();
  const unknownRepairTypes = new Set<string>();

  for (const [index, row] of grid.entries()) {
    const rowNumber = index + 1;

    const header = detectColumns(row);
    if (header) {
      columns = header;
      continue;
    }
    if (!columns) continue; // title rows above the header
    if (isLegendStart(row)) break; // «Сокращения» and everything after it

    const columnIndex = columns;
    const cell = (column: Column) => fixMisencodedChars(row[columnIndex[column]] ?? "").trim();
    const dispatchCell = cell("dispatch");
    const repairCell = cell("repair");
    const placeCell = cell("place");
    if (!dispatchCell && !repairCell && !placeCell) continue; // empty or spacer row

    result.rowsRead += 1;
    for (const key of ["res", "date", "time"] as const) {
      const value = cell(key);
      if (value) carried[key] = value;
    }

    const problems: string[] = [];
    const res = parseRes(carried.res);
    if (res === null) problems.push(`res: unrecognised «${carried.res}»`);
    const date = parseDate(carried.date);
    if (date === null) problems.push(`date: unrecognised «${carried.date}»`);
    const time = parseTimeRange(carried.time);
    if (time === null) problems.push(`time: unrecognised «${carried.time}»`);
    if (!placeCell) problems.push("place: empty");
    if (res === null || date === null || time === null || !placeCell) {
      result.invalid.push({ row: rowNumber, message: problems.join("; ") });
      continue;
    }

    const repair = mapRepairType(repairCell);
    if (!repair.known && repairCell) unknownRepairTypes.add(repairCell);

    const prepared = preparePlace(placeCell);
    const hiddenReason =
      placeCell === PLACE_HIDDEN ? "hidden in the cached copy" : prepared.privacyHints.join("; ");
    const isHidden = hiddenReason !== "";
    if (isHidden) result.hiddenPlaces.push({ row: rowNumber, message: hiddenReason });
    const place = isHidden ? PLACE_HIDDEN : prepared.place;
    const placeNormalized = isHidden ? "" : prepared.placeNormalized;

    const dispatchName = redactPersonalNames(dispatchCell);
    const fields = {
      res,
      date,
      timeFrom: time.from,
      timeTo: time.to,
      dispatchName,
      substations: extractSubstations(dispatchName),
      repairType: repair.type,
      repairTypeRaw: repairCell || "—",
      place,
      placeNormalized,
      sourceUrl: context.sourceUrl,
      weekStart: context.weekStart,
      weekEnd: context.weekEnd,
    };

    // Full duplicates: identical in every field. Checked before ids are assigned,
    // because a repeated row would otherwise get a disambiguated id and look unique.
    const key = JSON.stringify(fields);
    if (seen.has(key)) {
      result.duplicatesRemoved += 1;
      continue;
    }

    // Rows that differ only in time or repair type share the identifying fields;
    // disambiguate deterministically by occurrence so ids stay unique and stable.
    let id = outageId({ date, res, dispatchName, place });
    for (let occurrence = 2; usedIds.has(id); occurrence++) {
      id = outageId({ date, res, dispatchName, place, occurrence });
    }

    const parsed = AzhkOutageSchema.safeParse({ id, ...fields });
    if (!parsed.success) {
      result.invalid.push({
        row: rowNumber,
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      continue;
    }

    seen.add(key);
    usedIds.add(id);
    result.outages.push(parsed.data);
  }

  if (!columns) throw new Error("Schedule table header («Подразделение …») not found");
  result.unknownRepairTypes = [...unknownRepairTypes];
  return result;
}
