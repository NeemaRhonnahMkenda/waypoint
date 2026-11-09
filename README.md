# Waypoint · Travel planner for groups

Plan trips with family and friends: day-by-day itineraries, destinations on a map,
places to stay with links and votes, shared budgets in any currency, who-owes-whom
(by person or by family), and a printable itinerary.

**No database.** Trips live in the browser. Group sharing uses a tiny key-value
store (Upstash Redis, free tier). If that isn't set up, sharing falls back to a
link or file that carries the whole trip.

## Features

| Area | What it does |
| --- | --- |
| Overview | Countdown, route, stats, today's plan, "still deciding" ranked by votes, trip notes |
| Itinerary | Every day of the trip, activities by time, check-in/out reminders, live weather (Open-Meteo) |
| Places & stays | City search (Open-Meteo geocoding), route map (Leaflet + OpenStreetMap), ideas vs planned stops, reorder, votes; stays with booking links, prices per night, votes, "booked" status |
| Budget | Budget per category vs spent, spending by day chart, expenses in any currency converted at live rates (open.er-api.com), settle-up suggestions by person or family |
| Group | Travellers, families, "who am I on this device", trip settings, share, export, duplicate |
| Print | Paper-friendly itinerary with full URLs; "Save as PDF" from the print dialog |

All external APIs are free and need no API keys.

## Run locally

```bash
npm install
npm run dev
```
Open http://localhost:3000/waypoint (the app lives under `/waypoint`, see below).
Click **Explore a sample trip** to see every feature with demo data.

## Deploy

See "Live on the portfolio" below. For live group sharing, add **Upstash for Redis**
(free) to the *portfolio* Vercel project: Storage → Create → Upstash for Redis → connect → redeploy.

### Live on the portfolio (same deployment, separate repo)

This repo is not deployed on its own. The portfolio
([neema-portfolio](https://github.com/NeemaRhonnahMkenda/neema-portfolio)) pulls it into
its build and serves it at `/waypoint`:

```
push to waypoint/main ──► GitHub Action ──► portfolio deploy hook ──► Vercel builds portfolio
                                                                        └─ prebuild: git fetch waypoint → vendor/waypoint
```

What makes that work in this repo:

- `routes/` holds every page and API handler; `app/` here and `app/waypoint/` in the
  portfolio are one-line re-exports of them.
- Imports inside `components/`, `lib/` and `routes/` are relative, so they resolve from either host.
- `components/Shell.tsx` + `styles/waypoint.css` scope the theme to a `.wp` wrapper;
  `styles/theme.css` carries the Tailwind tokens a host imports.
- Paths come from env vars the host sets in its `next.config`:
  `NEXT_PUBLIC_WAYPOINT_BASE` (API and share links), `NEXT_PUBLIC_WAYPOINT_ROUTE_PREFIX`
  (page links) and `NEXT_PUBLIC_WAYPOINT_HOME_URL` (optional "Portfolio" back link).
- `.github/workflows/redeploy-portfolio.yml` triggers the portfolio rebuild (needs the
  `PORTFOLIO_DEPLOY_HOOK` secret; instructions in the file).

New dependencies added here must also be added to the portfolio's `package.json`.
Running this repo on its own (`npm run dev`) still works for development.

## How sharing works (no accounts)

```
Share with group  →  POST /api/trips  →  { id, editKey }
   edit link: /waypoint/t/<id>#k=<editKey>    plan together
   view link: /waypoint/t/<id>                read only
```

- Each device keeps its own copy in `localStorage` and syncs with the group copy:
  edits are pushed 1.2 s after the last change; the group copy is polled every 20 s
  and when the tab regains focus.
- Every save sends the version it was based on. A Lua script in Redis checks the edit key
  and the version **atomically**, so two people saving at the same moment get a
  "keep mine / use theirs" prompt instead of silently overwriting each other.

### Security notes

- **Capability links.** Share ids are 12 random base62 characters (~71 bits); edit keys are
  32 (~190 bits). Only a SHA-256 hash of the edit key is stored.
- **The edit key travels in the URL fragment** (`#k=`), which browsers never send to servers,
  so it stays out of logs and `Referer` headers. It's removed from the address bar on open.
  `Referrer-Policy: strict-origin-when-cross-origin` sends other sites only the origin, never the path, so share ids don't leak (OpenStreetMap tiles require a Referer, so `no-referrer` would break the map).
- **Validation.** Every trip is validated with one zod schema: on the server before saving,
  and on the client for imported links and files. Links must be `http(s)`, so
  `javascript:` URLs can't be smuggled into a shared trip.
- **Limits.** 256 KB per trip; per-IP rate limits (10 new shares/min, 60 saves/min,
  120 reads/min); shared trips expire 6 months after their last edit.
- `X-Frame-Options: DENY`, `nosniff`, and `noindex` on share pages and the API.
- Trade-off: anyone holding an edit link can edit until the trip expires. There is no
  revoke yet; a future version could rotate the edit key.

## Project structure

```
routes/                 every page + API handler (re-exported by app/ and by the portfolio)
styles/                 waypoint.css (scoped .wp theme), theme.css (Tailwind tokens)
app/                    standalone app: one-line re-exports of routes/
  api/trips/            create, read, update shared trips
  api/status/           is live sharing configured?
  trips/[id]/           trip workspace (+ /print)
  t/[id]/               opens a share link
  import/               opens a link-only trip
components/workspace/   Overview, Itinerary, Places, Budget, Group, modals
lib/
  types.ts              zod schema = data model
  store.ts              localStorage store + sample trip
  shareClient.ts        links, publish, sync engine
  shareServer.ts        Redis storage, CAS script, rate limits
  money.ts              currency conversion, budget maths, settle-up
  places.ts             geocoding + weather
```
