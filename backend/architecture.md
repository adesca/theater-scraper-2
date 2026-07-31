Backend Architecture Snapshot

Stack & entry point

Express 5 + TypeScript, compiled to CommonJS in backend/dist, run under pm2. backend/src/server.ts is the only server entry: creates the app, applies cors (locked to https://theater.adesca.dev unless ENV=dev), mounts two routers, and listens on 127.0.0.1 — port 4000 in prod, 3000 in dev (nginx serves the built frontend from /var/www/theater-scraper). There is no middleware beyond CORS and express.json(), no error handler, no logging, no startup/shutdown lifecycle.

package.json still carries Fastify deps (fastify-cli, @fastify/autoload, fastify-plugin) and backend/README.md still describes a Fastify app — both vestigial. is-odd is also unused.

Request flow (GET /performances)

1. server.ts:17 → src/routes/performances/index.ts.
2. Handler calls local fetchPerformances(), which awaits getBreakLegPerformances() then getNTPAPerformances() sequentially, stuffs them into an object, and flattens with Object.values(...).flat().
3. Each of those functions does the full fetch → parse → normalize chain inline and returns Listin
4. res.send({ listings }) — the entire dataset, unfiltered, unpaginated, unsorted.

GET /venues (src/routes/theaters/index.ts) is the same shape over getBreakLegTheaters(), returning { venues }. GET / returns "Hello World!".

No route takes query params. All filtering, searching, sorting and city derivation happens in the frontend (frontend/src/listings.tsx, sidePanel/CityFilter.tsx, filtersStore.ts), including the listing↔venue join, done by
lowercased string match of listing.company against venue.theaterName.

Where scraping occurs

All outbound network I/O funnels through one function: fetchWithDailyCache in src/services/fetchHae fetch() is called.

- Cache dir: THEATER_SCRAPER_CACHE_DIR env var, else .cache/http relative to process cwd (hence bocache/http/ exist in the repo — root from pm2, backend/ from npm run dev).
- Cache key: sha256(url).html.
- Freshness: file mtime falls on the same UTC calendar day → hit. Otherwise fetch, writeFile, re-s
- Non-2xx throws.
- Returns { body, cachedAt }, where cachedAt is the file mtime — this is the sole provenance timess Listing.timeOfFetch.

Scraping is triggered lazily on request: the first request of a UTC day pays the fetch cost inside, src/scrape.ts runs a node-cron job at 0 0 * * * that calls getBreakLegPerformances() to warm thecache; it runs as its own pm2 process (theater-scraper-update-script in ecosystem.config.js), so it shares state with the server only through the filesystem cache directory. It warms only the BreakLegs performances page — not
the BreakLegs directory page, not NTPA.

Parsing

src/helper.ts exposes parseDocument(html), wrapping linkedom's DOMParser and returning { $, $$ } hselector's ParseSelector. This is the one parsing abstraction.

- src/routes/fetchBreaklegs.ts uses it. getBreakLegPerformances maps over .listings li, pulling .tilters span, the data-id attribute, a.view:not(.tpane) href (prefixed with the origin), and theimage URL via regex against span.image's inline background-image. getBreakLegTheaters maps the /directory/ page's .listings li to name/address/website.
- src/routes/fetchNTPA.ts does not use parseDocument; it instantiates its own module-level DOMPars-post directly.

Non-null assertions and as unknown as HTMLSpanElement casts are used liberally at the DOM boundaryream site surfaces as a thrown TypeError, not a validation error.

Normalization

Target shapes live in /models.d.ts at the repo root, imported by both backend (../../../models) an name | startDate | endDate | company | id | tags[] | imageUrl | listingUrl | timeOfFetch. Venue:id | theaterName | address | website. (backend/tsconfig.json include lists ../models.ts, which doesn't exist — the .d.ts is picked up anyway.)

Per-source normalization decisions:

┌─────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
│         │                                                                         BreakLegs                                            │                         NTPA                          │
├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ id      │ data-id attribute                                                                                                            │ the listing URL (href)                                │
├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ dates   │ parseDateRange() — regex-locates the month, handles single dates, "Aug 2 - 9" day-onlyear-boundary crossing via subYears;    │ parse(text, 'MMMM d', new Date()) — year implicitly = │
│         │ falls back to hardcoded DEFAULT_YEAR = 2026                                                                                                               │  current year                                         │
├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ company │ .detail-text                                                                                                                                              │ "NTPA - " + <segment>                                 │
├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ tags    │ from .filters span                                                                                                                                        │ always []                                             │
├─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ output  │ ISO strings via toISOString()                                                                                                                             │ same                                                  │
└─────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

Incomplete records are dropped rather than repaired: .filter(l => l.name && l.company) for BreakLeing) for NTPA, both followed by as Listing[].

Caching & persistence

The only cache is the raw-HTML file cache described above — content-level, not record-level. Parseved from HTML on every single request; nothing memoizes them in memory, and no HTTP cache headersare set. There is no database in the serving path.

Drizzle/SQLite scaffolding exists but is entirely dead code — nothing imports it:
- src/constants.ts — DB_FILE_NAME = 'data.db' (relative path, resolved against cwd).
- src/db/schema.ts — a performances table with id (autoincrement int PK), name, startDate, endDate, company.
- src/initializeDB.ts — memoized getDB() singleton over drizzle-orm/node-sqlite.
- drizzle.config.ts — sqlite dialect, out: './drizzle'. No drizzle/ migrations directory exists.
- backend/data.db (12 KB) and backend/data.sqlite (0 bytes) are committed to git. drizzle-orm/driz

Data flow summary

cron (own pm2 process) ─┐
├─→ fetchWithDailyCache ──→ .cache/http/<sha256>.html
HTTP GET /performances ─┘         │                       (mtime = freshness + timeOfFetch)
↓
parseDocument / DOMParser  (linkedom)
↓
per-source map → Listing objects (ISO dates, dropped invalids)
↓
Object.values({breakLegs, ntpa}).flat()
↓
res.send({ listings })  ← full dataset
↓
frontend: react-query cache → client-side filter/search/sort/join

Patterns worth knowing

- Single network chokepoint. Every outbound request goes through fetchWithDailyCache, which is whyy via THEATER_SCRAPER_CACHE_DIR + mkdtemp + a mocked globalThis.fetch(backend/test/services/fetchHandler.test.ts, backend/test/routes/performances/fetchPerformances.test.ts), and why e2e can intercept with msw (e2e/support/backend-with-msw.ts).
- One function per source, fetch+parse+normalize fused. getXPerformances() is the unit of compositectly. There is no service/repository layer, no per-source interface or registry — adding a sourcemeans adding a key to the object literal in fetchPerformances().
- Shared root type file as the contract between backend and frontend.
- Fixture-driven unit tests with inline HTML strings; src/routes/ntpaFixtures.ts is a 447-line captured NTPA page used by fetchNTPA.test.ts.
- No error boundary. Rejections propagate to Express 5's default handler → bare 500. Sources are c selector change) takes down BreakLegs listings in the same response.

Structural facts that bear on introducing a database

- No write seam. Scrape, parse, and normalize are one fused expression per source that ends in retly persists a record, so there's no place a writer would slot in without splitting those functions.
- Freshness semantics live in the filesystem. "Is this stale?" is mtime on an HTML file, and timeOfFetch is derived from that same mtime. Both would need a new source of truth.
- Identity is not uniform or unique-constrained. BreakLegs ids are source-scoped data-id strings; o (source, id) uniqueness concept anywhere, and the existing schema.ts uses an autoincrementinteger PK that doesn't correspond to either.
- The existing schema is a subset. performances lacks source, tags, imageUrl, listingUrl, timeOfFeno relational representation.
- Venue↔Listing has no key. The relation exists only as a client-side lowercased name match; there is no FK, and Venue.id falls back to the theater name when data-id is absent.
- Dates are ISO strings with fragile year inference (DEFAULT_YEAR = 2026 for BreakLegs, current-yef dates participate in upsert keys or dedup.
- Two processes, shared state only via files. Server and cron are separate pm2 apps; DB_FILE_NAME and the cache dir are both relative paths resolved against cwd, and the cwd already differs between dev and prod.
- No migrations are committed and getDB() is never called, so there's no working connection lifecyshutdown handling in server.ts.
- Reads are all-or-nothing. No query params, filters, or pagination exist server-side, and the frontend expects the full list — so the read path's shape is currently independent of anything a query layer would offer.