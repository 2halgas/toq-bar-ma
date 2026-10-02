import { describe, expect, it } from "vitest";

import { pluralize } from "@/lib/plural";

const forms = { one: "отключение", few: "отключения", many: "отключений" };

describe("pluralize", () => {
  it.each([
    [0, "отключений"],
    [1, "отключение"],
    [2, "отключения"],
    [4, "отключения"],
    [5, "отключений"],
    [11, "отключений"],
    [12, "отключений"],
    [14, "отключений"],
    [21, "отключение"],
    [22, "отключения"],
    [25, "отключений"],
    [111, "отключений"],
    [101, "отключение"],
  ])("%i → %s", (count, expected) => {
    expect(pluralize(count, forms)).toBe(expected);
  });
});
