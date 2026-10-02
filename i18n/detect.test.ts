import { describe, expect, it } from "vitest";

import { detectLocale } from "@/i18n/detect";

describe("detectLocale", () => {
  it("prefers an explicit saved choice", () => {
    expect(detectLocale(["en-US"], "kk")).toBe("kk");
  });

  it("ignores an invalid saved value", () => {
    expect(detectLocale(["en-US"], "de")).toBe("en");
  });

  it("uses the first supported browser language", () => {
    expect(detectLocale(["de-DE", "kk-KZ", "ru"], null)).toBe("kk");
    expect(detectLocale(["ru-KZ", "en"], null)).toBe("ru");
    expect(detectLocale(["en-GB"], null)).toBe("en");
  });

  it('treats "kz" as Kazakh', () => {
    expect(detectLocale(["kz"], null)).toBe("kk");
  });

  it("falls back to Russian", () => {
    expect(detectLocale(["de", "fr"], null)).toBe("ru");
    expect(detectLocale([], null)).toBe("ru");
  });
});
