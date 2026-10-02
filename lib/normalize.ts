/**
 * Kazakh-specific letters folded to their closest Russian counterparts, so that
 * "Төле би" and "Толе би" match. Applied after lower-casing.
 */
const LETTER_FOLDING: Record<string, string> = {
  ё: "е",
  ә: "а",
  ғ: "г",
  қ: "к",
  ң: "н",
  ө: "о",
  ұ: "у",
  ү: "у",
  һ: "х",
  і: "и",
};

/** Abbreviations written with an inner hyphen, collapsed before hyphens become spaces. */
const HYPHENATED_TYPES = /(?<![\p{L}\d])(пр-кт|пр-т|мкр-н|б-р)(?![\p{L}\d])/gu;

/** Street-type words that carry no meaning for search (RU + KZ), compared after punctuation is stripped. */
const STREET_TYPE_WORDS = new Set([
  "ул",
  "улица",
  "пр",
  "просп",
  "проспект",
  "пркт",
  "прт",
  "мкр",
  "мкрн",
  "микрорайон",
  "пер",
  "переулок",
  "бр",
  "бул",
  "бульвар",
  "ш",
  "шоссе",
  "пл",
  "площадь",
  "туп",
  "тупик",
  "наб",
  "набережная",
  "им",
  "имени",
  "кошеси",
  "дангылы",
  "шагын",
  "аудан",
  "ыкшам",
]);

/**
 * Canonical form of a street name for comparison: lower case, ё→е and Kazakh
 * letters folded, punctuation and street-type words ("ул.", "пр-т", "мкр.", …)
 * removed, hyphens and repeated whitespace collapsed to single spaces.
 *
 * @example normalizeStreet("  Ул.  Төле-би ") === "толе би"
 */
export function normalizeStreet(input: string): string {
  const folded = input
    .toLowerCase()
    .replace(/[ёәғқңөұүһі]/g, (letter) => LETTER_FOLDING[letter] ?? letter)
    .replace(HYPHENATED_TYPES, (match) => match.replace("-", ""));

  return folded
    .replace(/[^\p{L}\d]+/gu, " ")
    .split(" ")
    .filter((word) => word !== "" && !STREET_TYPE_WORDS.has(word))
    .join(" ");
}

/**
 * True when every word of the query occurs in the street name, in any order.
 * An empty (or type-word-only) query matches everything.
 */
export function matchesStreet(street: string, query: string): boolean {
  const queryWords = normalizeStreet(query).split(" ").filter(Boolean);
  if (queryWords.length === 0) return true;

  const normalizedStreet = normalizeStreet(street);
  return queryWords.every((word) => normalizedStreet.includes(word));
}
