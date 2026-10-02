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
/** The same in capitals: «ИВАНОВ ИВАН ИВАНОВИЧ», «НУРЛАНОВ НУРЛАН САПАРҰЛЫ». */
const CAPS_PATRONYMIC = `[${UPPER}]{2,}(?:ОВИЧ|ЕВИЧ|ИЧ|ОВНА|ЕВНА|ИЧНА|ИНИЧНА|УЛЫ|ҰЛЫ|КЫЗЫ|ҚЫЗЫ)`;
const CAPS_FULL_NAME = `[${UPPER}]{2,}(?:-[${UPPER}]{2,})?\\s+[${UPPER}]{2,}\\s+${CAPS_PATRONYMIC}`;
/** Trade names: «ИП "Рахат"», «ИП «Береке»». */
const QUOTED = `["«“][^"»”]{1,60}["»”]`;
/** «ЖУМАБЕКОВ», «ЖУМАБЕКОВ А.А.» — some rows are typed in capitals. */
const CAPS_NAME = `[${UPPER}]{2,}(?:-[${UPPER}]{2,})?(?:\\s+${INITIALS})?`;
/** Russian patronymic endings only: «-улы/-кызы» also end street names like «Момышулы». */
const RUSSIAN_PATRONYMIC = `[${UPPER}][${LOWER}]+(?:ович|евич|овна|евна|ична|инична)`;

// Order matters: the most specific patterns first.
const RULES: [RegExp, string][] = [
  // ИП + full name / surname with initials / initials + surname / quoted trade name / bare surname.
  [
    new RegExp(
      `(?<![${UPPER}${LOWER}])ИП\\s*(?:${FULL_NAME}|${CAPS_FULL_NAME}|${SURNAME}\\s+${INITIALS}|${INITIALS}\\s?${SURNAME}|${QUOTED}|${CAPS_NAME}|${SURNAME})`,
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
  // «Иванов Иван Иванович», «ИВАНОВ ИВАН ИВАНОВИЧ».
  [new RegExp(`(?<![${UPPER}${LOWER}])${FULL_NAME}(?![${LOWER}])`, "gu"), REDACTED_PERSON],
  [
    new RegExp(`(?<![${UPPER}${LOWER}])${CAPS_FULL_NAME}(?![${UPPER}${LOWER}])`, "gu"),
    REDACTED_PERSON,
  ],
  // «ИВАНОВ И.И.»
  [
    new RegExp(
      `(?<![${UPPER}${LOWER}.])[${UPPER}]{2,}(?:-[${UPPER}]{2,})?\\s+${INITIALS}(?![${UPPER}${LOWER}])`,
      "gu",
    ),
    REDACTED_PERSON,
  ],
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
  const patronymic = new RegExp(`(?<![${UPPER}${LOWER}])${RUSSIAN_PATRONYMIC}(?![${LOWER}])`, "u");
  const capsPatronymic = new RegExp(
    `(?<![${UPPER}${LOWER}])${CAPS_PATRONYMIC}(?![${UPPER}${LOWER}])`,
    "u",
  );
  if (patronymic.test(redactedText) || capsPatronymic.test(redactedText)) {
    hints.push("patronymic-like word");
  }
  return hints;
}

/** Text with redaction placeholders removed — for the search index, which must not match them. */
/**
 * Redacts a table cell for storage. If the result still looks like it may contain
 * a name, the whole cell is replaced — better to hide an address than leak a name.
 */
export function redactCellForStorage(text: string, hiddenText: string): string {
  const redacted = redactPersonalNames(text);
  return findPersonalDataHints(redacted).length > 0 ? hiddenText : redacted;
}

export function stripRedactionPlaceholders(text: string): string {
  return text.replaceAll(REDACTED_SOLE_PROPRIETOR, " ").replaceAll(REDACTED_PERSON, " ");
}
