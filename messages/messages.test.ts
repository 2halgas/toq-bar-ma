import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/i18n/routing";

import en from "./en.json";
import kk from "./kk.json";
import ru from "./ru.json";

const CATALOGS = { ru, kk, en } as const;

type Tree = { [key: string]: string | Tree };

/** Flattens nested messages into "Namespace.key" → message. */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string" ? [[path, value]] : Object.entries(flatten(value, path));
    }),
  );
}

/** ICU arguments ("{count, plural, …}", "{period}") and rich-text tags ("<link>"). */
function placeholders(message: string): string[] {
  const args = [...message.matchAll(/\{(\w+)\s*[,}]/g)].map((match) => `{${match[1]}}`);
  const tags = [...message.matchAll(/<(\w+)>/g)].map((match) => `<${match[1]}>`);
  return [...new Set([...args, ...tags])].sort();
}

const flat = Object.fromEntries(
  Object.entries(CATALOGS).map(([locale, tree]) => [locale, flatten(tree as Tree)]),
) as Record<keyof typeof CATALOGS, Record<string, string>>;
const reference = flat.ru;

describe("message catalogs", () => {
  it("cover every locale", () => {
    expect(Object.keys(CATALOGS).sort()).toEqual([...LOCALES].sort());
  });

  it.each(["kk", "en"] as const)("%s has exactly the same keys as ru", (locale) => {
    expect(Object.keys(flat[locale]).sort()).toEqual(Object.keys(reference).sort());
  });

  it.each(["kk", "en"] as const)("%s uses the same arguments and tags as ru", (locale) => {
    const mismatches = Object.keys(reference)
      .filter((key) => key !== "Common.addressesInRussian") // intentionally empty in ru
      .filter(
        (key) =>
          placeholders(flat[locale][key] ?? "").join() !==
          placeholders(reference[key] ?? "").join(),
      );
    expect(mismatches).toEqual([]);
  });

  it.each(LOCALES)("every %s message formats without ICU errors", (locale) => {
    const errors: string[] = [];
    const t = createTranslator({
      locale,
      messages: CATALOGS[locale],
      onError: (error) => errors.push(error.message),
    });
    const values = {
      count: 3,
      number: 2,
      period: "P",
      query: "Q",
      date: "D",
      label: "L",
      from: "F",
      to: "T",
    };
    for (const key of Object.keys(flat[locale])) {
      // Rich-text messages need tag handlers; markup() accepts plain functions.
      (t as unknown as { markup: (key: string, values: object) => string }).markup(key, {
        ...values,
        link: (chunks: string) => chunks,
        time: (chunks: string) => chunks,
      });
    }
    expect(errors).toEqual([]);
  });

  it("uses each language's plural rules", () => {
    const format = (locale: (typeof LOCALES)[number], count: number) =>
      createTranslator({ locale, messages: CATALOGS[locale] })("Common.outages", { count });
    expect([1, 3, 5, 21].map((n) => format("ru", n))).toEqual([
      "1 отключение",
      "3 отключения",
      "5 отключений",
      "21 отключение",
    ]);
    expect([1, 5].map((n) => format("kk", n))).toEqual(["1 өшіру", "5 өшіру"]);
    expect([1, 5].map((n) => format("en", n))).toEqual(["1 outage", "5 outages"]);
  });
});
