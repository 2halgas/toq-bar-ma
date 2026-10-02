const pluralRules = new Intl.PluralRules("ru");

export interface RussianPluralForms {
  /** 1, 21, 31… — «отключение» */
  one: string;
  /** 2–4, 22–24… — «отключения» */
  few: string;
  /** 0, 5–20, 25–30… — «отключений» */
  many: string;
}

/** Picks the Russian plural form for `count`, e.g. 1 отключение, 3 отключения, 5 отключений. */
export function pluralize(count: number, forms: RussianPluralForms): string {
  const category = pluralRules.select(count);
  return category === "one" || category === "few" ? forms[category] : forms.many;
}

export const OUTAGE_FORMS: RussianPluralForms = {
  one: "отключение",
  few: "отключения",
  many: "отключений",
};
