/**
 * Removes names of private individuals from schedule text. The source lists
 * affected consumers next to addresses, e.g. «ИП Фамилия И.О. - ул. …, д. 18»
 * or «Фамилия И.О. - ул. …». We never store or display those names.
 *
 * Deliberately NOT treated as names: initials *before* a surname («ул. С.Ашимова»,
 * «Д.Кунаева») — that's how streets named after people are written. Company
 * names (ТОО, АО, ГКП…) are not personal data and are kept.
 */

export const REDACTED_SOLE_PROPRIETOR = "[ИП]";
export const REDACTED_PERSON = "[частное лицо]";

// Includes the misencoded Ќ/Ў so redaction holds even before fixMisencodedChars runs.
const UPPER = "А-ЯЁӘҒҚҢӨҰҮҺІЌЎ";
const LOWER = "а-яёәғқңөұүһіќў";

/** «Иванов», «Иванова-Петрова». */
const SURNAME = `[${UPPER}][${LOWER}]+(?:-[${UPPER}][${LOWER}]+)?`;
/** «И.О.», «И. О.», «И.» — the trailing dot of the last initial is optional. */
const INITIALS = `[${UPPER}]\\.\\s?(?:[${UPPER}]\\.?)?`;
/** «Иванович», «Ивановна», «Ильич», «Сапарулы», «Сапаркызы». */
const PATRONYMIC = `[${UPPER}][${LOWER}]+(?:ович|евич|ич|овна|евна|ична|инична|улы|ұлы|кызы|қызы)`;
const FULL_NAME = `${SURNAME}\\s+[${UPPER}][${LOWER}]+\\s+${PATRONYMIC}`;
/** Trade names: «ИП "Рахат"», «ИП «Береке»». */
const QUOTED = `["«“][^"»”]{1,60}["»”]`;

// Order matters: the most specific patterns first.
const RULES: [RegExp, string][] = [
  // ИП + full name / surname with initials / initials + surname / quoted trade name / bare surname.
  [
    new RegExp(
      `(?<![${UPPER}${LOWER}])ИП\\s*(?:${FULL_NAME}|${SURNAME}\\s+${INITIALS}|${INITIALS}\\s?${SURNAME}|${QUOTED}|${SURNAME})`,
      "gu",
    ),
    REDACTED_SOLE_PROPRIETOR,
  ],
  // «гр. Иванов И.И.», «гражданин Иванов».
  [
    new RegExp(
      `(?<![${UPPER}${LOWER}])(?:гр\\.|гражданин|гражданка)\\s*(?:${SURNAME}(?:\\s+${INITIALS})?)`,
      "gu",
    ),
    REDACTED_PERSON,
  ],
  // «Иванов Иван Иванович».
  [new RegExp(`(?<![${UPPER}${LOWER}])${FULL_NAME}(?![${LOWER}])`, "gu"), REDACTED_PERSON],
  // «Иванов И.И.», «Иванов И. И.», «Иванов И.»
  [
    new RegExp(`(?<![${UPPER}${LOWER}.])${SURNAME}\\s+${INITIALS}(?![${UPPER}${LOWER}])`, "gu"),
    REDACTED_PERSON,
  ],
];

export function redactPersonalNames(text: string): string {
  return RULES.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );
}

/**
 * Second line of defence, run on already redacted text: flags leftovers that
 * look like a name so a human can extend the rules. Returns reasons only —
 * never the matched text, so logs can't leak names either.
 */
export function findPersonalDataHints(redactedText: string): string[] {
  const hints: string[] = [];
  if (
    new RegExp(`(?<![${UPPER}${LOWER}])ИП(?![${UPPER}${LOWER}])\\s+[${UPPER}"«]`, "u").test(
      redactedText,
    )
  ) {
    hints.push("ИП followed by an unrecognised name");
  }
  if (new RegExp(`(?<![${UPPER}${LOWER}])${PATRONYMIC}(?![${LOWER}])`, "u").test(redactedText)) {
    hints.push("patronymic-like word");
  }
  return hints;
}

/** Text with redaction placeholders removed — for the search index, which must not match them. */
export function stripRedactionPlaceholders(text: string): string {
  return text.replaceAll(REDACTED_SOLE_PROPRIETOR, " ").replaceAll(REDACTED_PERSON, " ");
}
