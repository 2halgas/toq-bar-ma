import { describe, expect, it } from "vitest";

import { auditPrivacy } from "@/lib/azhk/privacy-audit";
import { redactPersonalNames } from "@/lib/azhk/redact";

const total = (text: string) => Object.values(auditPrivacy(text)).reduce((a, b) => a + b, 0);

// Fictional names in the shapes seen in real schedules.
const SAMPLES = [
  "ИП Иванова Г.Р. - ул.Кожаханова,18",
  "Петров А.П. -ул.Коммунальная, д.52",
  "ИВАНОВ ИВАН ИВАНОВИЧ, ул. Манат",
  "ул. Манат, д.3 ПЕТРОВА А.Б.",
  "гр. Сидоров, ул. Манат",
  "ИП Сидоров, ул. Манат",
];

describe("auditPrivacy", () => {
  it("catches every sample before redaction", () => {
    for (const sample of SAMPLES) expect(total(sample)).toBeGreaterThan(0);
  });

  it("finds nothing after redaction", () => {
    for (const sample of SAMPLES) expect(total(redactPersonalNames(sample))).toBe(0);
  });

  it("ignores addresses, streets and organisations", () => {
    expect(
      total('ул. С.Ашимова; пр. Бауыржан Момышулы; ТОО "ТЕХНОСЕРВИС"; мкр. Айгерим-1, ул. МТФ'),
    ).toBe(0);
  });
});
