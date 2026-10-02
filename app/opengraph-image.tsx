import { ImageResponse } from "next/og";

import { loadOgFonts } from "@/lib/og/fonts";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same sequence as the dark-theme choropleth palette in globals.css.
const SWATCHES = ["#3f3f46", "#78350f", "#b45309", "#f59e0b", "#fde047"];
const TILE_LEVELS = [3, 1, 4, 2, 0, 2, 1, 3];

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#262626",
            marginBottom: 40,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="#facc15">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 38, marginTop: 24, color: "#d4d4d8" }}>
          {/* Keep the one-letter preposition with the next word when the line wraps. */}
          {siteConfig.tagline.replace(/ в /g, " в\u00a0")}
        </div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#a1a1aa" }}>
          Поиск по улице · карта районов · неофициальный сервис
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", width: 264, gap: 16 }}>
        {TILE_LEVELS.map((level, index) => (
          <div
            key={index}
            style={{ width: 124, height: 96, borderRadius: 20, background: SWATCHES[level] }}
          />
        ))}
      </div>
    </div>,
    { ...size, fonts: await loadOgFonts() },
  );
}
