import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Geist (OFL) for generated images. Satori needs TTF/OTF data and the default
 * font has no Cyrillic, so the files ship with the repo in assets/fonts.
 */
export async function loadOgFonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-400.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-700.ttf")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
