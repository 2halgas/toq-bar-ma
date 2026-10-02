/**
 * Generates demo outages for the week starting today (Asia/Almaty) and writes data/outages.json.
 *
 *   pnpm data:demo                    # week starting today
 *   pnpm data:demo --from 2026-10-05  # week starting on a given date
 *
 * Output is deterministic for a given start date. Streets are real, schedule entries are not.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { addDaysToIsoDate, getAlmatyToday } from "@/lib/dates";
import {
  DISTRICT_IDS,
  IsoDateSchema,
  OutagesFileSchema,
  type District,
  type Outage,
  type OutagesFile,
  type Reason,
} from "@/lib/schema";
import { siteConfig } from "@/lib/site";

const OUTPUT_PATH = "data/outages.json";
const DAYS = 7;

/** Real streets and microdistricts, grouped by the district they (mostly) belong to. */
const STREETS: Record<District, readonly string[]> = {
  alatau: [
    "мкр. Шанырак-2",
    "ул. Северное кольцо",
    "мкр. Айгерим-1",
    "ул. Алихана Бокейханова",
    "мкр. Карасу",
  ],
  almaly: [
    "ул. Толе би",
    "ул. Казыбек би",
    "ул. Байтурсынулы",
    "ул. Шевченко",
    "ул. Масанчи",
    "ул. Карасай батыра",
  ],
  auezov: [
    "ул. Жандосова",
    "ул. Шаляпина",
    "ул. Утеген батыра",
    "пр. Саина",
    "мкр. Аксай-3",
    "мкр. Мамыр-4",
  ],
  bostandyk: [
    "ул. Тимирязева",
    "пр. Сатпаева",
    "ул. Розыбакиева",
    "пр. Гагарина",
    "ул. Ходжанова",
    "мкр. Орбита-1",
  ],
  zhetysu: [
    "мкр. Кулагер",
    "мкр. Айнабулак-3",
    "ул. Жансугурова",
    "ул. Акан серы",
    "ул. Ратушного",
  ],
  medeu: ["пр. Достык", "ул. Кунаева", "ул. Зенкова", "ул. Пушкина", "мкр. Самал-2"],
  nauryzbay: ["мкр. Калкаман-2", "мкр. Шугыла", "мкр. Таусамалы", "мкр. Акжар", "ул. Жунисова"],
  turksib: ["ул. Майлина", "пр. Суюнбая", "ул. Бекмаханова", "ул. Шолохова", "мкр. Жулдыз-1"],
};

/** Uneven on purpose so the choropleth shows a range of shades. */
const DISTRICT_WEIGHTS: Record<District, number> = {
  almaly: 3,
  auezov: 3,
  bostandyk: 3,
  alatau: 2,
  medeu: 2,
  turksib: 2,
  zhetysu: 1,
  nauryzbay: 1,
};

const REASON_WEIGHTS: Record<Reason, number> = {
  current_repair: 5,
  capital_repair: 2,
  contractor_works: 2,
  defect_elimination: 3,
  other: 1,
};

const TIME_SLOTS = [
  ["09:00", "17:00"],
  ["10:00", "18:00"],
  ["08:00", "17:00"],
  ["09:00", "13:00"],
  ["14:00", "18:00"],
  ["10:00", "16:00"],
] as const;

/** mulberry32: tiny seeded PRNG so the same start date yields the same file. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(isoDate: string): number {
  return [...isoDate].reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
    2166136261,
  );
}

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

function pickWeighted<K extends string>(random: () => number, weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1]![0];
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** House lists in the same shapes AZhK uses: ranges, enumerations, letters, "all". */
function randomHouses(random: () => number): string {
  const start = randomInt(random, 1, 120);
  switch (randomInt(random, 0, 4)) {
    case 0:
      return `${start}–${start + randomInt(random, 4, 30)}`;
    case 1: {
      const end = start + randomInt(random, 2, 12);
      return `${start}–${end}, ${end + randomInt(random, 3, 10)}`;
    }
    case 2:
      return Array.from({ length: randomInt(random, 2, 4) }, (_, i) => start + i * 2).join(", ");
    case 3:
      return `${start}, ${start}А, ${start}Б`;
    default:
      return "все дома";
  }
}

function isWeekend(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function generateOutages(from: string, seed: number): Outage[] {
  const random = createRandom(seed);
  const outages: Outage[] = [];

  for (let offset = 0; offset < DAYS; offset++) {
    const date = addDaysToIsoDate(from, offset);
    const count = isWeekend(date) ? randomInt(random, 1, 2) : randomInt(random, 6, 7);
    const usedStreets = new Set<string>();

    while (usedStreets.size < count) {
      const district = pickWeighted(random, DISTRICT_WEIGHTS);
      const street = pick(random, STREETS[district]);
      if (usedStreets.has(street)) continue;
      usedStreets.add(street);

      const [timeFrom, timeTo] = pick(random, TIME_SLOTS);
      outages.push({
        id: `demo-${date}-${String(usedStreets.size).padStart(2, "0")}`,
        district,
        street,
        houses: randomHouses(random),
        date,
        timeFrom,
        timeTo,
        reason: pickWeighted(random, REASON_WEIGHTS),
        sourceUrl: siteConfig.azhkScheduleUrl,
      });
    }
  }

  return outages;
}

/** Re-rolls (deterministically) until every district appears at least once, so the map has data everywhere. */
function generateDemoData(from: string, now: Date = new Date()): OutagesFile {
  const baseSeed = seedFromDate(from);
  let outages: Outage[] = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    outages = generateOutages(from, baseSeed + attempt);
    const covered = new Set(outages.map((outage) => outage.district));
    if (DISTRICT_IDS.every((district) => covered.has(district))) break;
  }

  return OutagesFileSchema.parse({
    isDemo: true,
    updatedAt: new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString(),
    sourceUrl: siteConfig.azhkScheduleUrl,
    outages,
  });
}

function main(): void {
  const { values } = parseArgs({ options: { from: { type: "string" } } });
  const from = IsoDateSchema.parse(values.from ?? getAlmatyToday());

  const data = generateDemoData(from);
  const target = resolve(process.cwd(), OUTPUT_PATH);
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);

  console.log(
    `Wrote ${data.outages.length} demo outages for ${from} … ${addDaysToIsoDate(from, DAYS - 1)} to ${OUTPUT_PATH}`,
  );
}

main();
