import { ImageResponse } from "next/og";

// Generated once at build time, so it also works with `output: "export"`.
export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171717",
      }}
    >
      <svg width="112" height="112" viewBox="0 0 24 24" fill="#facc15">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>,
    size,
  );
}
