# Тоқ бар ма? — Almaty planned power outages

> _"Тоқ бар ма?"_ is Kazakh for _"Is there power?"_

<!--
  TODO: add a GIF or screenshot (mobile + desktop), e.g. docs/screenshot.png, and uncomment:
  <p align="center"><img src="docs/screenshot.png" alt="Street search, outage list and map" width="900" /></p>
-->

An unofficial, mobile-first map of planned power outages in Almaty. Type your street and see in a few seconds whether, when and why the power will be cut. The data is parsed every day from the weekly schedules published by Alatau Zharyk Company (AZhK).

**Live demo:** _coming soon_ <!-- TODO: https://<project>.vercel.app -->

## Features

- **Street search** that forgives how people type: `м-н` / `м-он` / `мкр.` / `мкр`, `ул.`, `пр-т`, case, `ё`/`е`, Kazakh letters (`Ақжар` → `Акжар`), hyphens and extra spaces.
- **Filters** by date (today / tomorrow / week / any day) and power network unit (РЭС), **stored in the URL** so any view can be shared as a link.
- **List** grouped by day and РЭС: time and duration, affected addresses, equipment (substation), repair type, “today” / “tomorrow” badges.
- **Map** of the streets and microdistricts mentioned in the schedule, with clustered markers; click a marker to see its outages or filter the list by that place.
- **Honest empty states:** “no outages planned” is distinguished from “no schedule published for these dates yet”.
- **Three languages:** Russian, Kazakh and English at `/ru`, `/kk`, `/en`; `/` picks the browser's language and keeps shared filters. Addresses stay in Russian, as AZhK publishes them.
- **Responsive:** list + sticky map side by side on desktop, `List / Map` tabs on mobile. **Dark theme**, system by default.
- **Accessible:** semantic landmarks and headings, labelled controls, visible focus, keyboard-operable map; everything on the map is also in the list.

## How the data works

```
azhk.kz schedule list ─► newest «город Алматы» schedule ─► HTML table
   │  pnpm data:fetch (daily, 1 req/s)
   ▼
expand rowspan/colspan ─► normalize dates, times, repair types ─► redact personal names
   ─► dedupe ─► zod validation ─► data/outages.json
   │  pnpm data:geocode (only new places, 1 req/s)
   ▼
extract streets / microdistricts ─► OpenStreetMap Nominatim ─► data/geocache.json
   │  pnpm data:audit ─► no name-like patterns allowed
   ▼
commit ─► Vercel rebuilds the static site
```

A GitHub Actions workflow ([`update-data.yml`](.github/workflows/update-data.yml)) runs this every day at 06:00 Almaty time and commits `data/` only when something changed. Nothing is committed unless the privacy audit, data validation, tests and build all pass.

## Privacy

AZhK schedules sometimes list affected consumers by name (sole proprietors, private individuals). **This project never stores or shows them**:

1. Names are redacted at parse time (`ИП Фамилия И.О.` → `[ИП]`, `Фамилия И.О.` → `[частное лицо]`) — see [`lib/azhk/redact.ts`](lib/azhk/redact.ts). Company names are kept.
2. If a cell still looks like it contains a name, the whole address is replaced with “Адрес скрыт — см. график на сайте АЖК”.
3. The page cache in `data/raw/` holds only the redacted table and is not committed; ids are hashed from the redacted text.
4. `pnpm data:audit` scans every data file for name-like patterns and fails the pipeline if it finds any. Logs report row numbers and reasons only, never the text.

Tests use synthetic HTML and fictional names only.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, statically prerendered) + TypeScript (strict)
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix)
- [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) + [react-leaflet-cluster](https://github.com/akursat/react-leaflet-cluster), client-side only
- [cheerio](https://cheerio.js.org) for parsing, [zod](https://zod.dev) for validating every file that enters the app
- [date-fns](https://date-fns.org) (ru locale); “today” is always computed in `Asia/Almaty`
- [next-intl](https://next-intl.dev) for ru / kk / en, statically rendered per locale (no middleware)
- [Vitest](https://vitest.dev), ESLint, Prettier, GitHub Actions. Deploys to [Vercel](https://vercel.com) or any static host. No backend.

## Getting started

Requires Node.js ≥ 20.9 and pnpm (the version is pinned in `package.json`; pnpm switches to it automatically).

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm check      # typecheck + lint + format check + unit tests
```

| Script               | What it does                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm data:fetch`    | Download and parse the newest AZhK schedule into `data/outages.json` (`--force` to re-download) |
| `pnpm data:geocode`  | Geocode places not yet in `data/geocache.json` (`--limit N`, `--retry-not-found`)               |
| `pnpm data:audit`    | Fail if any data file contains name-like patterns                                               |
| `pnpm data:validate` | Validate `data/outages.json` (also happens during `pnpm build`)                                 |
| `pnpm build`         | Production build                                                                                |
| `pnpm build:static`  | Plain static site in `out/` for any static host (GitHub Pages, Cloudflare Pages, Netlify)       |

### Environment variables

Both are optional locally and should be set as **repository secrets** for the daily workflow:

| Variable           | Used by        | Why                                                                                                                            |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GEOCODER_CONTACT` | `data:geocode` | Email or URL in the User-Agent, as the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) asks |
| `AZHK_CONTACT`     | `data:fetch`   | Contact in the User-Agent sent to azhk.kz                                                                                      |

## Deploying

1. Push the repository to GitHub and import it on Vercel — no configuration or env vars needed.
2. In **Settings → Secrets and variables → Actions**, add `GEOCODER_CONTACT` (and optionally `AZHK_CONTACT`).
3. In **Settings → Actions → General**, allow workflows **read and write** permissions so the daily job can push.
4. Run **Actions → Update data → Run workflow** once to check that everything works.

> GitHub pauses scheduled workflows in repositories with no activity for 60 days. If that happens, re-enable it from the Actions tab.

## Map accuracy

A marker is the approximate centre of a street or microdistrict as found by Nominatim, not a specific building — long streets get a single point. About 85–90 % of places in a typical schedule are found; the rest (often typos in the source, e.g. «Веницианова») are still in the list, and the map says how many outages it couldn't place. Lookups are restricted to Almaty's district bounds so same-named streets in Talgar or Kaskelen don't show up.

## Project structure

```
app/            # layout, page, metadata, OG image, manifest
components/     # filters/, outages/, map/, layout/, ui/ (shadcn)
hooks/          # URL-backed filters, Almaty "today", media query
lib/azhk/       # schedule parsing: list, table, values, normalization, redaction, toponyms, audit (+ tests, fixtures)
lib/geo/        # geocache schema
lib/            # filtering, dates, URL state, map points (+ tests)
data/           # outages.json, geocache.json (generated; raw/ is git-ignored)
scripts/        # fetch-outages, geocode, audit-privacy, validate-data
```

## Disclaimer

This is an **unofficial** project and is not affiliated with Alatau Zharyk Company. Data is parsed automatically and may contain parsing errors; schedules can change at short notice and emergency outages are not shown. **Always check the [official AZhK schedules](https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics).**

Map data and geocoding © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via [Nominatim](https://nominatim.org). Base map tiles come from the OpenStreetMap tile servers, which are fine for a low-traffic hobby project under their [usage policy](https://operations.osmfoundation.org/policies/tiles/); switch to a commercial tile provider if traffic grows.

## Roadmap

- [x] Parser for AZhK schedules, updated daily
- [ ] Individual buildings on the map (geocoding house numbers)
- [ ] Telegram bot with notifications for a saved address
- [x] Kazakh and English localization
- [ ] Search in Latin script (`aigerim` → «Айгерим»)
