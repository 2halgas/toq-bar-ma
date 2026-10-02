/**
 * Latin-script search over Cyrillic addresses.
 *
 * Kazakh place names have many Latin spellings — Zhetysu / Jetisu, Shanyrak /
 * Şañyraq (2021 Kazakh Latin), Aigerim / Aygerim, Raiymbek / Raimbek. Rather
 * than guess one Cyrillic spelling from the query, both sides are reduced to a
 * shared Latin "skeleton" in which those variants collapse to the same string.
 */

/** Russian letters (after `normalizePlace` folding Kazakh ones) → Latin. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Kazakh Latin (2021) and other diacritics → plain Latin. */
const LATIN_DIACRITICS: Record<string, string> = {
  ş: "sh",
  ç: "ch",
  ğ: "g",
  ñ: "n",
  ö: "o",
  ü: "u",
  ū: "u",
  ä: "a",
  ı: "i",
};

/** Street-type words a Latin query may use, mapped to the skeleton of мкр / ул / пр. */
const LATIN_TYPE_ALIASES: Record<string, string> = {
  mkr: "mkr",
  mkrn: "mkr",
  md: "mkr",
  mn: "mkr",
  microdistrict: "mkr",
  mikrorayon: "mkr",
  mikroraion: "mkr",
  ul: "ul",
  ulitsa: "ul",
  ulica: "ul",
  st: "ul",
  str: "ul",
  street: "ul",
  pr: "pr",
  prospekt: "pr",
  prospect: "pr",
  ave: "pr",
  avenue: "pr",
};

const TYPE_SKELETONS = new Set(Object.values(LATIN_TYPE_ALIASES));

/** QWERTY keys → the Russian ЙЦУКЕН letters on the same keys (typing with the wrong layout). */
const QWERTY_TO_JCUKEN: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з", "[": "х", "]": "ъ",
  a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о", k: "л", l: "д", ";": "ж", "'": "э",
  z: "я", x: "ч", c: "с", v: "м", b: "и", n: "т", m: "ь", ",": "б", ".": "ю", "`": "ё",
}; // prettier-ignore

export function hasLatin(text: string): boolean {
  return /[a-z]/i.test(text);
}

/**
 * Collapses spelling variants shared by both directions. Kept deliberately
 * narrow: every rule must map variants of the *same* name together without
 * merging different names (e.g. "abaya" must not shrink to "aba" and start
 * matching «Абаева» or «Кабанбай»).
 */
function reduce(latin: string): string {
  return latin
    .replace(/sch/g, "sh")
    .replace(/iy(?=[au])/g, "i") // Rossiya / Rossia (ия)
    .replace(/y(?=[eo])/g, "") // Satpayeva → Satpaeva (Сатпаева), Yerlan → Erlan
    .replace(/y(?![au])/g, "i") // Aygerim → Aigerim, Dostyk → Dostik (ы, й)
    .replace(/(.)\1+/g, "$1"); // Raiymbek → Raimbek, Kassymov → Kasimov
}

/** Skeleton of an already normalized (Cyrillic, lower-case, folded) place. */
export function cyrillicSkeleton(placeNormalized: string): string {
  const latin = [...placeNormalized].map((char) => CYRILLIC_TO_LATIN[char] ?? char).join("");
  return reduce(latin);
}

/** Skeleton of a Latin query: diacritics, digraphs (zh→j, kh→h, ts→c), type words. */
export function latinSkeleton(query: string): string {
  const words = query
    .toLowerCase()
    .replace(/[şçğñöüūäı]/g, (char) => LATIN_DIACRITICS[char] ?? char)
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // remaining accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => LATIN_TYPE_ALIASES[word] ?? word);

  // English puts the type last ("Abay Ave", "Ratushnogo Street"); the source puts it first.
  const last = words.at(-1);
  if (words.length > 1 && last && TYPE_SKELETONS.has(last)) words.unshift(words.pop() ?? last);

  const latin = words
    .join(" ")
    .replace(/zh/g, "j")
    .replace(/kh|x/g, "h")
    .replace(/tz|ts/g, "c")
    .replace(/q/g, "k")
    .replace(/w/g, "u");
  return reduce(latin);
}

/** "fqutHbv" → "айгерим": the query was typed with the English layout active. */
export function fromWrongLayout(query: string): string {
  return [...query.toLowerCase()].map((char) => QWERTY_TO_JCUKEN[char] ?? char).join("");
}
