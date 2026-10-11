import { cyrillicSkeleton, hasLatin, latinSkeleton } from "@/lib/azhk/latin";
import { normalizePlace } from "@/lib/azhk/normalize";

/**
 * "Did you mean" for a search that found nothing: place names from the schedule
 * that differ from the query by a single typo per word («гагрина» → «Гагарина»).
 * Only offered as a suggestion, never mixed into results, so a near miss like
 * «Абая» / «Абаева» can't put someone else's street into the list.
 */

/** Words shorter than this must match exactly: one edit changes too much of them. */
const MIN_FUZZY_LENGTH = 5;
const MAX_EDITS_PER_WORD = 1;
const MAX_SUGGESTIONS = 3;

/** Street-type words on either side (normalized Cyrillic and Latin skeletons) aren't compared. */
const TYPE_WORDS = new Set(["мкр", "ул", "пр", "пер", "жк", "mkr", "ul", "pr"]);

/**
 * Optimal string alignment distance (insertions, deletions, substitutions and
 * swaps of adjacent letters), giving up with `max + 1` once it exceeds `max`.
 */
export function editDistance(a: string, b: string, max = MAX_EDITS_PER_WORD): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (beforePrevious[j - 2] ?? 0) + 1);
      }
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    beforePrevious = previous;
    previous = current;
  }
  return Math.min(previous[b.length] ?? max + 1, max + 1);
}

function words(text: string): string[] {
  return text.split(/[^\p{L}\d]+/u).filter((word) => word && !TYPE_WORDS.has(word));
}

/**
 * Edits needed for one query word against one place word, or undefined if too
 * many. The last query word may be unfinished, so it is also compared with the
 * beginning of the place word («гагрин» ~ «гагарин|а»).
 */
function wordEdits(queryWord: string, placeWord: string, isLast: boolean): number | undefined {
  if (queryWord === placeWord) return 0;
  if (queryWord.length < MIN_FUZZY_LENGTH || /\d/.test(queryWord)) return undefined;

  let edits = editDistance(queryWord, placeWord);
  if (isLast) {
    for (let length = queryWord.length - 1; length <= queryWord.length + 1; length++) {
      edits = Math.min(edits, editDistance(queryWord, placeWord.slice(0, length)));
    }
  }
  return edits <= MAX_EDITS_PER_WORD ? edits : undefined;
}

/** Fewest edits for the query words to match consecutive words of the place, if any. */
function phraseEdits(queryWords: string[], placeWords: string[]): number | undefined {
  let best: number | undefined;
  for (let start = 0; start + queryWords.length <= placeWords.length; start++) {
    let total = 0;
    for (const [index, queryWord] of queryWords.entries()) {
      const edits = wordEdits(
        queryWord,
        placeWords[start + index] ?? "",
        index === queryWords.length - 1,
      );
      if (edits === undefined) {
        total = Number.POSITIVE_INFINITY;
        break;
      }
      total += edits;
    }
    if (total < (best ?? Number.POSITIVE_INFINITY)) best = total;
  }
  return best;
}

const nameCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

/**
 * Up to three place names (as written in the schedule) that the query probably
 * meant, closest first. Exact matches are left out: the search finds those itself.
 */
export function suggestPlaces(query: string, placeNames: Iterable<string>): string[] {
  const latin = hasLatin(query);
  const queryWords = words(latin ? latinSkeleton(query) : normalizePlace(query));
  if (queryWords.length === 0) return [];

  const scored = new Map<string, { name: string; edits: number }>();
  for (const name of placeNames) {
    const normalized = normalizePlace(name);
    if (scored.has(normalized)) continue;
    const placeWords = words(latin ? cyrillicSkeleton(normalized) : normalized);
    const edits = phraseEdits(queryWords, placeWords);
    if (edits !== undefined && edits > 0) scored.set(normalized, { name, edits });
  }

  return [...scored.values()]
    .sort((a, b) => a.edits - b.edits || nameCollator.compare(a.name, b.name))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ name }) => name);
}
