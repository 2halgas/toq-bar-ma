/**
 * Last line of defence before data is committed: counts name-like patterns in
 * an output file. Reports counts per check only — never the matched text.
 * Patterns are intentionally broader than the redaction rules.
 */
const UPPER = "А-ЯЁӘҒҚҢӨҰҮҺІЌЎ";
const LOWER = "а-яёәғқңөұүһіќў";

export const PRIVACY_CHECKS: Record<string, RegExp> = {
  "surname + initials": new RegExp(
    `[${UPPER}][${UPPER}${LOWER}]+\\s+[${UPPER}]\\.\\s?[${UPPER}]\\.`,
    "gu",
  ),
  "ИП + name": new RegExp(`(?<![${UPPER}${LOWER}])ИП\\s+[^\\[\\s]`, "gu"),
  patronymic: new RegExp(
    `(?<![${UPPER}${LOWER}])[${UPPER}][${UPPER}${LOWER}]+(?:ович|евич|овна|евна|ична|ОВИЧ|ЕВИЧ|ОВНА|ЕВНА|ИЧНА)(?![${UPPER}${LOWER}])`,
    "gu",
  ),
  "гр. + name": new RegExp(`(?<![${UPPER}${LOWER}])гр\\.\\s*[${UPPER}]`, "gu"),
};

export function auditPrivacy(text: string): Record<string, number> {
  return Object.fromEntries(
    Object.entries(PRIVACY_CHECKS).map(([name, pattern]) => [
      name,
      text.match(pattern)?.length ?? 0,
    ]),
  );
}
