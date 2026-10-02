import { type MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";
import ru from "@/messages/ru.json";

// Generated once at build time, so it also works with `output: "export"`.
export const dynamic = "force-static";

// One manifest for the whole site; it describes the default (Russian) version.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ru.Metadata.title,
    short_name: siteConfig.name,
    description: ru.Metadata.description,
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
