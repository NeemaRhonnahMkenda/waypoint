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

## Deploy to Vercel

1. Push this folder to a GitHub repo, e.g. `waypoint`.
2. Vercel → **Add New → Project** → import the repo → **Deploy**.
3. *(Optional, for live group sharing)* In the Vercel project: **Storage → Create → Upstash for Redis**
   → free plan → connect to this project. It adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   automatically. Redeploy. The Share button now creates live group links.
4. Check it at `https://<project>.vercel.app/waypoint`.

### Mount it in the portfolio

Add this to the portfolio's `content/projects.ts` and push:

```ts
{
  slug: "waypoint",
  title: "Waypoint",
  summary: "A travel planner for families and friends: shared itineraries, places to stay, budgets and who-owes-whom.",
  highlights: [
    "Local-first: trips live in the browser; groups share via edit and view links, no accounts",
    "Optimistic sync with conflict detection over a Redis key-value store",
    "Live weather, place search, maps and currency conversion from free public APIs",
    "Budget charts and fewest-transfers settle-up by person or by family",
  ],
  stack: ["Next.js", "TypeScript", "Tailwind", "Upstash Redis", "Leaflet", "Recharts", "Zod"],
  repoUrl: "https://github.com/NeemaRhonnahMkenda/waypoint",
  mountUrl: "https://<project>.vercel.app",   // no /waypoint here; the portfolio adds it
  year: 2026,
  featured: true,
},
```

Waypoint is then live at `https://<portfolio>.vercel.app/waypoint`.

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
app/
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
