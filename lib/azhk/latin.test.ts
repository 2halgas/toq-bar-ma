import { describe, expect, it } from "vitest";

import { cyrillicSkeleton, fromWrongLayout, latinSkeleton } from "@/lib/azhk/latin";
import { matchesPlace, normalizePlace } from "@/lib/azhk/normalize";

// Real (redacted) place texts from AZhK schedules.
const place = (text: string) => normalizePlace(text);
const aigerim = place(
  "жилые дома (частный сектор) м-н Айгерим-1, ул. МТФ ;ул.Азаттык; м-н Шанырак-2 ул.Веселова; Жанкожа батыра",
);
const ratushnogo = place("ул.Ратушного 94,94/1");
const almaty = place("ул. Верди, пр. Рыскулова, Богенбай батыра, Абылай хана, ул. Сатпаева");
const kokTobe = place("п.Кок-Тюбе, ул.Ақтаңгер, д.19/1, м-он Кок-Тобе");
const samal = place('м-он "Самал-1", д.19, м-он "Самал-2", д.104');
const mkr8 = place("мкр.8, д.29-34");
const zhetysu = place("мкр. Жетысу-2, ул. Джандосова, ул. Райымбека");

describe("matchesPlace with Latin queries", () => {
  it.each([
    [aigerim, "aigerim 1"],
    [aigerim, "Aygerim-1"],
    [aigerim, "mkr Aigerim 1"],
    [aigerim, "microdistrict aigerim 1"],
    [aigerim, "shanyrak 2"],
    [aigerim, "Şañyraq 2"],
    [aigerim, "zhankozha batyra"],
    [aigerim, "Azattyk"],
    [aigerim, "azattyq"],
    [ratushnogo, "ratushnogo"],
    [ratushnogo, "ul. ratushnogo"],
    [ratushnogo, "ratushnogo street"],
    [almaty, "ryskulova"],
    [almaty, "Ryskulov Ave"],
    [almaty, "bogenbay batyra"],
    [almaty, "abylai khana"],
    [almaty, "Abylai Khan"],
    [almaty, "satpayeva"],
    [almaty, "satpaeva"],
    [kokTobe, "kok-tobe"],
    [kokTobe, "Kök-Töbe"],
    [kokTobe, "aktanger"],
    [zhetysu, "zhetysu 2"],
    [zhetysu, "jetisu 2"],
    [zhetysu, "dzhandosova"],
    [zhetysu, "jandosov"],
    [zhetysu, "raiymbek"],
    [zhetysu, "raimbeka"],
  ])("%j finds %j", (placeNormalized, query) => {
    expect(matchesPlace(placeNormalized, query)).toBe(true);
  });

  it.each([
    [aigerim, "aigerim 2"],
    [samal, "samal 3"],
    [ratushnogo, "tole bi"],
    [mkr8, "mkr 5"],
  ])("%j does not match %j", (placeNormalized, query) => {
    expect(matchesPlace(placeNormalized, query)).toBe(false);
  });

  it("does not merge different names (regression: «abaya» once matched «Абаева»)", () => {
    expect(matchesPlace(place("ул. Абаева, Кабанбай батыра"), "abaya")).toBe(false);
    expect(matchesPlace(place("пр. Абая"), "abaya")).toBe(true);
  });

  it("keeps the phrase rule: a bare number needs its type", () => {
    expect(matchesPlace(mkr8, "mkr 8")).toBe(true);
    expect(matchesPlace(place("мкр. Аксай-5, д.5-9"), "mkr 8")).toBe(false);
  });

  it("finds Russian typed with the English keyboard layout", () => {
    expect(fromWrongLayout("fqutHbv")).toBe("айгерим");
    expect(matchesPlace(aigerim, "fqutHbv")).toBe(true);
    expect(matchesPlace(ratushnogo, "hfneiyjuj")).toBe(true);
  });

  it("leaves Cyrillic queries to the Cyrillic matcher", () => {
    expect(matchesPlace(aigerim, "айгерим 1")).toBe(true);
    expect(matchesPlace(aigerim, "айгерим 2")).toBe(false);
  });
});

describe("skeletons", () => {
  it("reduce spelling variants on both sides to the same string", () => {
    expect(latinSkeleton("Zhetysu")).toBe(cyrillicSkeleton("жетысу"));
    expect(latinSkeleton("Jetisu")).toBe(cyrillicSkeleton("жетысу"));
    expect(latinSkeleton("Şañyraq")).toBe(cyrillicSkeleton("шанырак"));
    expect(latinSkeleton("Kirpichnaya")).toBe(cyrillicSkeleton("кирпичная"));
    expect(latinSkeleton("Ulitsa")).toBe(cyrillicSkeleton("ул"));
  });
});
