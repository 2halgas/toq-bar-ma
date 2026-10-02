# Тоқ бар ма? — Almaty planned power outages

> _"Тоқ бар ма?"_ is Kazakh for _"Is there power?"_

<!--
  TODO: add a GIF or screenshot (mobile + desktop), e.g. docs/screenshot.png, and uncomment:
  <p align="center"><img src="docs/screenshot.png" alt="Street search, outage list and district map" width="900" /></p>
-->

An unofficial, mobile-first map of planned power outages in Almaty. Type your street and see in a few seconds whether, when and why the power will be cut — based on the weekly schedules published by Alatau Zharyk Company (AZhK).

**Live demo:** _coming soon_ <!-- TODO: https://<project>.vercel.app -->

## Features

- **Street search** that forgives the way people type: case, `ул.` / `пр.` / `мкр.` prefixes, `ё`/`е`, Kazakh letters (`Төле би` → `Толе би`), extra spaces.
- **Filters** by date (today / tomorrow / week / any day) and district, **stored in the URL** so any view can be shared as a link.
- **List** grouped by day and district, with “today” / “tomorrow” badges and outage duration.
- **Choropleth map** of the 8 districts coloured by outage count, with legend and tooltips; click (or press <kbd>Enter</kbd>) on a district to filter by it.
- **Responsive layout:** list + sticky map side by side on desktop, `List / Map` tabs on mobile.
- **Dark theme** (system by default) with map colours tuned for both themes.
- **Accessible:** semantic landmarks and headings, labelled controls, visible focus, keyboard-operable map, and everything on the map is also available in the list.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, statically prerendered) + TypeScript (strict)
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix)
- [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org), loaded client-side only
- [zod](https://zod.dev) for validating the outage data and district boundaries
- [date-fns](https://date-fns.org) (ru locale); all “today” logic uses the `Asia/Almaty` time zone
- [Vitest](https://vitest.dev), ESLint, Prettier
- No backend: data lives in a static JSON file in the repo. Deployed on [Vercel](https://vercel.com).

## Getting started

Requires Node.js ≥ 20.9 and pnpm (the exact version is pinned in `package.json`; Corepack or pnpm itself will switch to it).

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm check      # typecheck + lint + format check + unit tests
```

| Script               | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `pnpm build`         | Production build (fails if `data/outages.json` is invalid) |
| `pnpm test`          | Unit tests (filtering, normalization, dates, URL state, …) |
| `pnpm data:validate` | Validate `data/outages.json` without building              |
| `pnpm data:demo`     | Regenerate demo data for the week starting today           |
| `pnpm geo:fetch`     | Re-download district boundaries from OpenStreetMap         |

## Updating the data

All outages live in [`data/outages.json`](data/outages.json):

```jsonc
{
  "isDemo": false, // true = show the "demo data" banner
  "updatedAt": "2026-10-05T09:00:00+05:00", // shown in the footer
  "sourceUrl": "https://www.azhk.kz/ru/spetsialnye-razdely/graphics/101-grafik-otklyuchenij",
  "outages": [
    {
      "id": "2026-10-06-almaly-001", // any unique string
      "district": "almaly", // see below
      "street": "ул. Толе би", // as written in the schedule
      "houses": "1–15, 21", // as written in the schedule
      "date": "2026-10-06", // YYYY-MM-DD
      "timeFrom": "09:00", // HH:mm, Almaty time
      "timeTo": "17:00", // must be later than timeFrom
      "reason": "current_repair", // see below
      "sourceUrl": "https://www.azhk.kz/…", // link to that week's schedule
    },
  ],
}
```

- **`district`**: `alatau` · `almaly` · `auezov` · `bostandyk` · `zhetysu` · `medeu` · `nauryzbay` · `turksib`
- **`reason`**: `current_repair` (текущий ремонт) · `capital_repair` (капитальный ремонт) · `contractor_works` (подрядные работы) · `defect_elimination` (устранение дефектов) · `other`

Steps:

1. Copy the entries from the [AZhK schedule](https://www.azhk.kz/ru/spetsialnye-razdely/graphics/101-grafik-otklyuchenij) into the format above.
2. Set `"isDemo": false` and update `updatedAt`.
3. Run `pnpm data:validate`. Every problem is reported with its path and record id, e.g. `outages[12].timeTo (id "…"): Must be later than timeFrom`. The same check runs during `pnpm build`, so invalid data never gets deployed.

> While `isDemo` is `true`, the app shifts all demo dates so that the earliest one is today. That keeps the deployed demo looking fresh without rebuilds; real data is never shifted.

## District boundaries

[`public/geo/almaty-districts.geojson`](public/geo/almaty-districts.geojson) contains the 8 district polygons, simplified to ~30 m (≈24 KB). It is validated with zod when the map loads.

**Regenerate automatically:**

```bash
pnpm geo:fetch
```

**Or by hand with [overpass-turbo](https://overpass-turbo.eu):**

1. Run this query:

   ```
   [out:json][timeout:90];
   area["name:en"="Almaty"]["boundary"="administrative"]->.city;
   rel(area.city)["boundary"="administrative"]["admin_level"="6"];
   out geom;
   ```

2. _Export → GeoJSON → download_.
3. Simplify it (e.g. on [mapshaper.org](https://mapshaper.org), ~90 % simplification) and keep only Polygon/MultiPolygon features.
4. Give each feature exactly one property, `"district"`, with a slug from the list above (match on the `name:ru` tag, e.g. `Медеуский район` → `medeu`).
5. Save it as `public/geo/almaty-districts.geojson`.

## Project structure

```
app/          # layout, page, metadata, OG image, manifest
components/   # filters/, outages/, map/, layout/, ui/ (shadcn)
hooks/        # URL-backed filters, Almaty "today", media query
lib/          # pure logic: schemas, filtering, normalization, dates, choropleth scale (+ tests)
data/         # outages.json
public/geo/   # district boundaries
scripts/      # demo data generator, data validator, OSM boundary fetcher
assets/fonts/ # Geist (OFL) for the Open Graph image
```

## Disclaimer

This is an **unofficial** project and is not affiliated with Alatau Zharyk Company. Schedules can change at short notice and emergency outages are not shown. **Always check the [official AZhK schedule](https://www.azhk.kz/ru/spetsialnye-razdely/graphics/101-grafik-otklyuchenij).**

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL). Base map tiles come from the OpenStreetMap tile servers, which are fine for a low-traffic hobby project under their [usage policy](https://operations.osmfoundation.org/policies/tiles/); switch to a commercial tile provider if traffic grows.

## Roadmap

- [ ] Parser for AZhK schedules, so data updates don't need manual copying
- [ ] Individual buildings on the map (geocoding house numbers)
- [ ] Telegram bot with notifications for a saved address
- [ ] Kazakh and English localization
