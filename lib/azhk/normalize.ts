import { cyrillicSkeleton, fromWrongLayout, hasLatin, latinSkeleton } from "@/lib/azhk/latin";

/**
 * The source occasionally types Macedonian/Belarusian look-alikes instead of
 * Kazakh letters (Ќ for Қ, Ў for Ұ). Applied to every text field we keep.
 */
const MISENCODED_CHARS: Record<string, string> = {
  Ќ: "Қ",
  ќ: "қ",
  Ў: "Ұ",
  ў: "ұ",
};

export function fixMisencodedChars(text: string): string {
  return text.replace(/[ЌќЎў]/g, (char) => MISENCODED_CHARS[char] ?? char);
}

/** Kazakh letters folded to their closest Russian ones, so "Ақжар" and "Акжар" match. */
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

// `(?<!\p{L})…(?!\p{L})` = whole word, so "ул" never matches inside "улжан".
const ABBREVIATIONS: [RegExp, string][] = [
  [/(?<!\p{L})(?:м-он|м-н|мкр-н|мкрн|мкр|микрорайон\p{L}*)\.?(?!\p{L})/gu, " мкр "],
  [/(?<!\p{L})(?:пр-кт|пр-т|просп|проспект\p{L}*|пр)\.?(?!\p{L})/gu, " пр "],
  [/(?<!\p{L})(?:улица|ул)\.?(?!\p{L})/gu, " ул "],
];

const STREET_TYPES = new Set(["мкр", "пр", "ул"]);

/**
 * Canonical form of a place for search. The same function is applied to the
 * schedule text and to what the user types, so both sides always agree:
 *
 * - misencoded letters fixed, lower case, ё→е, Kazakh letters folded;
 * - м-н / м-он / мкр. / мкр → мкр; пр-т / пр. → пр; ул. → ул;
 * - dots, quotes and hyphens become spaces ("ул.Толе" → "ул толе", "Айгерим-1" → "айгерим 1");
 * - whitespace collapsed, no space before commas/semicolons.
 */
export function normalizePlace(text: string): string {
  let result = fixMisencodedChars(text)
    .toLowerCase()
    .replace(/[ёәғқңөұүһі]/g, (letter) => LETTER_FOLDING[letter] ?? letter);

  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/[."'«»“”„`‐‑–—-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([,;:])/g, "$1")
    .trim();
}

/**
 * Phrase match with an optional leading street type: the whole query must appear
 * as a phrase, so "самал 2" doesn't match "самал 1, д 2". A leading type word is
 * optional ("ул толе би" also finds "толе би ул") unless the rest is only a
 * number ("мкр 8" must not match every "8").
 */
function phraseMatches(haystack: string, needle: string, typeWords: ReadonlySet<string>): boolean {
  if (needle === "" || typeWords.has(needle)) return true;
  if (haystack.includes(needle)) return true;

  const [first, ...rest] = needle.split(" ");
  const withoutType = rest.join(" ");
  return (
    first !== undefined &&
    typeWords.has(first) &&
    /\p{L}/u.test(withoutType) &&
    haystack.includes(withoutType)
  );
}

const LATIN_STREET_TYPES = new Set(["mkr", "ul", "pr"]);
const skeletonCache = new Map<string, string>();

/**
 * Does a normalized place match the user's query? Cyrillic queries are
 * normalized like the place itself. Latin queries also work: "aigerim 1",
 * "zhetysu", "Şañyraq", or Russian typed on an English keyboard layout.
 */
export function matchesPlace(placeNormalized: string, query: string): boolean {
  if (phraseMatches(placeNormalized, normalizePlace(query), STREET_TYPES)) return true;
  if (!hasLatin(query)) return false;

  let placeSkeleton = skeletonCache.get(placeNormalized);
  if (placeSkeleton === undefined) {
    placeSkeleton = cyrillicSkeleton(placeNormalized);
    skeletonCache.set(placeNormalized, placeSkeleton);
  }

  return (
    phraseMatches(placeSkeleton, latinSkeleton(query), LATIN_STREET_TYPES) ||
    phraseMatches(placeNormalized, normalizePlace(fromWrongLayout(query)), STREET_TYPES)
  );
}
