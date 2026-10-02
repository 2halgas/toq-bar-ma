import { fixMisencodedChars, normalizePlace } from "@/lib/azhk/normalize";
import { stripRedactionPlaceholders } from "@/lib/azhk/redact";

/**
 * Extracts geocodable place names (microdistricts, streets, …) from a schedule's
 * free-text «место отключения». Works on the already redacted `place`.
 *
 * Real examples it has to cope with:
 *   «м-н Айгерим-1, ул. МТФ ;ул.Азаттык; м-н Шанырак-2 ул.Веселова; Жанкожа батыра»
 *   «Шакарима, Тургут Озала, Кулымбетова, Туркебаева»          ← bare names are streets
 *   «ул.1-я Кирпично-Заводская д.7/Фурманова/Аль-Фараби»       ← "/" = intersection
 *   «пр.Достык, д.240 ТОО "Компания Достар"»                    ← organisations are skipped
 */

export type ToponymKind = "мкр" | "ул" | "пр" | "пер" | "жк";

export interface Toponym {
  kind: ToponymKind;
  /** As written, e.g. "Айгерим-1", "Жанкожа батыра". */
  name: string;
  /** Display label, e.g. "мкр. Айгерим-1". */
  label: string;
  /** Stable lookup key: `normalizePlace(kind + name)`, e.g. "мкр айгерим 1". */
  key: string;
}

const KIND_LABELS: Record<ToponymKind, string> = {
  мкр: "мкр.",
  ул: "ул.",
  пр: "пр.",
  пер: "пер.",
  жк: "ЖК",
};

const L = "\\p{L}";
const UPPER_START = "[А-ЯЁӘҒҚҢӨҰҮҺІA-Z0-9]";

/**
 * Type prefixes as written in the source. Case is spelled out instead of using
 * the `i` flag, so that names still have to start with a capital letter.
 */
const TYPE_PATTERN =
  "(?<type>[мМ]-он|[мМ]-н|[мМ]кр-н|[мМ]крн|[мМ]кр|[мМ]икрорайон|[уУ]лица|[уУ]л|[пП]р-кт|[пП]р-т|[пП]роспект|[пП]р|[пП]ереулок|[пП]ер|[жЖ]\\.?[кК])";

/**
 * A type prefix followed by a dot, space or quote, then a capitalised name made
 * of words/digits/hyphens/dots. Stops before house numbers («д.5», «94», «№№»),
 * punctuation, or the next type prefix.
 */
const TYPED_TOPONYM = new RegExp(
  `(?<![${L}])${TYPE_PATTERN}(?:\\.\\s*|\\s+|(?=["«]))["«]?` +
    `(?<name>${UPPER_START}[${L}\\d.\\-]*` +
    `(?:\\s+(?!(?:д|дом|кв|оф|корп|уч)\\.?(?:\\s|\\d|$))(?!(?:м-он|м-н|мкр|ул|пр|пер)[.\\s])[${L}][${L}.\\-]*)*)`,
  "gu",
);

const ORGANISATION_WORDS =
  /(?:^|\s)(?:ТОО|АО|ГУ|КГУ|ГККП|РГКП|РГП|ГКП|КГП|ИП|ПК|ПКСК|ПКСГ|КСК|ОСИ|ПТ|ОО|ЧУ|филиал|акимат|школа|гимназия|детский|больница|поликлиника|центр|компания)(?:\s|$|["«])/iu;

/** Bare street names: «Шакарима», «Жанкожа батыра», «Ш.Айманова», «Тургут Озала». */
const BARE_NAME = new RegExp(
  `^${UPPER_START.replace("0-9", "")}[${L}.\\-]*(?:\\s+[${L}][${L}.\\-]*){0,3}$`,
  "u",
);

function kindOf(type: string): ToponymKind {
  const t = type.toLowerCase().replace(/\./g, "");
  if (/^(?:м-он|м-н|мкр-н|мкрн|мкр|микрорайон)$/u.test(t)) return "мкр";
  if (t === "ул" || t === "улица") return "ул";
  if (/^(?:пр|пр-т|пр-кт|проспект)$/u.test(t)) return "пр";
  if (t === "пер" || t === "переулок") return "пер";
  return "жк";
}

function makeToponym(kind: ToponymKind, rawName: string): Toponym | null {
  const name = rawName
    .replace(/["«»“”]/g, "")
    .replace(/[\s.\-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const isNumberedMicrodistrict = kind === "мкр" && /^\d+$/.test(name);
  if ((name.length < 2 && !isNumberedMicrodistrict) || name.length > 40 || /[[\]]/.test(name)) {
    return null;
  }
  // Streets need a letter; microdistricts may be just a number («мкр.8»).
  if (kind !== "мкр" && !/\p{L}{2}/u.test(name)) return null;
  return {
    kind,
    name,
    label: `${KIND_LABELS[kind]} ${name}`,
    key: normalizePlace(`${kind} ${name}`),
  };
}

/** Unique toponyms in order of appearance. */
export function extractToponyms(place: string): Toponym[] {
  const found = new Map<string, Toponym>();
  const add = (toponym: Toponym | null) => {
    if (toponym && !found.has(toponym.key)) found.set(toponym.key, toponym);
  };

  const text = fixMisencodedChars(place)
    .replace(/\([^)]*сектор[^)]*\)/giu, " ") // «(частный сектор)»
    .replace(/\s+/g, " ");

  // Items: list separators, plus "/" which joins intersecting streets.
  for (const rawItem of text.split(/[;,/]|\s-\s/u)) {
    const item = stripRedactionPlaceholders(rawItem)
      .replace(/[()]/g, " ")
      .replace(/^[^:]*:\s*/u, "")
      .replace(/^[\s:–-]+|[\s.:]+$/gu, "")
      .replace(/\s+/g, " ");
    if (!item) continue;

    const typed = [...item.matchAll(TYPED_TOPONYM)];
    if (typed.length > 0) {
      for (const match of typed) {
        const { type = "", name = "" } = match.groups ?? {};
        // «мкр Мирас 128»: house numbers after a named microdistrict aren't part of it.
        add(makeToponym(kindOf(type), name));
      }
      continue;
    }

    // An untyped item is a street if it looks like a name and nothing else.
    // …and has no abbreviations («ЖКХ», «РГКП»): those are organisations, not streets.
    const hasAbbreviation = /(?<!\p{L})\p{Lu}{2,}(?!\p{L})/u.test(item);
    if (BARE_NAME.test(item) && !ORGANISATION_WORDS.test(item) && !hasAbbreviation) {
      add(makeToponym("ул", item));
    }
  }

  return [...found.values()];
}
