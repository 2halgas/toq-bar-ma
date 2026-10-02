import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // `pnpm build:static` writes a plain static site to out/ for hosts without
  // a Node server (GitHub Pages, Cloudflare Pages, Netlify, any web server).
  ...(process.env.STATIC_EXPORT === "1" && { output: "export" }),
};

export default withNextIntl(nextConfig);
