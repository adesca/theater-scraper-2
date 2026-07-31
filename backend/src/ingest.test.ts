import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const tempDirs: string[] = [];

let ingestAll: typeof import("./ingest").ingestAll;
let fetchPerformances: typeof import("./routes/performances").fetchPerformances;
let fetchVenues: typeof import("./routes/theaters").fetchVenues;

const PERFORMANCES_URL = "https://goodshow.breaklegs.com/performances-by-show/";
const DIRECTORY_URL = "https://goodshow.breaklegs.com/directory/";
const NTPA_URL = "https://ntpa.org/tickets/";

function performancesHtml(includeSecondListing: boolean) {
  return String.raw`
<!doctype html>
<html>
  <body>
    <ul class="listings">
      <li data-id="glass-menagerie">
        <span class="image" style="background-image: url('https://images.test/glass.jpg')"></span>
        <span class="text">The Glass Menagerie</span>
        <span class="detail-text">Lakefront Theater</span>
        <span class="dates">On stage August 2 - 9</span>
        <span class="filters"><span>drama</span></span>
        <a class="view" href="/performances/glass-menagerie/">view</a>
      </li>
      ${includeSecondListing ? String.raw`
      <li data-id="glass-menagerie-north">
        <span class="image"></span>
        <span class="text">The Glass Menagerie</span>
        <span class="detail-text">Northside Players</span>
        <span class="dates">On stage August 5 - 12</span>
        <span class="filters"></span>
        <a class="view" href="/performances/glass-menagerie-north/">view</a>
      </li>` : ""}
    </ul>
  </body>
</html>
`;
}

const directoryHtml = String.raw`
<!doctype html>
<html>
  <body>
    <ul class="listings">
      <li data-id="lakefront-theater">
        <div class="contents">
          <p class="text">Lakefront Theater</p>
          <p class="detail-text">100 Main St, Richardson, TX</p>
          <p class="details">https://example.test/lakefront</p>
        </div>
      </li>
      <li data-id="northside-players">
        <div class="contents">
          <p class="text">Northside Players</p>
          <p class="detail-text">200 Oak Ave, Plano, TX</p>
          <p class="details">https://example.test/northside</p>
        </div>
      </li>
    </ul>
  </body>
</html>
`;

// The text before "»" is the listing's WordPress category list, and the venue is the last
// en-dash segment after it -- matching the captured page in scrapers/ntpaFixtures.ts.
const ntpaHtml = String.raw`
<!doctype html>
<html>
  <body>
    <div class="fusion-events-post">
      <a href="https://ntpa.org/events/frozen-jr/">Plano Performances » Frozen Jr. – Community Theatre Plano – Rodenbaugh Theatre</a>
      <span class="tribe-event-date-start">September 4</span>
      <span class="tribe-event-date-end">September 14</span>
    </div>
  </body>
</html>
`;

function mockSources(includeSecondListing = true) {
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);

    const body =
        url === PERFORMANCES_URL ? performancesHtml(includeSecondListing)
      : url === DIRECTORY_URL ? directoryHtml
      : url === NTPA_URL ? ntpaHtml
      : null;

    if (body === null) throw new Error(`Unexpected fetch for ${url}`);

    return new Response(body, { status: 200, statusText: "OK" });
  }) as typeof globalThis.fetch;
}

// A fresh cache directory per ingest, so the second run re-parses the new HTML instead of
// reusing the same-day cached copy.
async function useFreshCacheDir() {
  const dir = await mkdtemp(join(tmpdir(), "theater-scraper-ingest-cache-"));
  tempDirs.push(dir);
  process.env.THEATER_SCRAPER_CACHE_DIR = dir;
}

beforeAll(async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "theater-scraper-ingest-db-"));
  tempDirs.push(dbDir);
  process.env.THEATER_SCRAPER_DB_FILE = join(dbDir, "test.db");

  // Imported after the env vars are set: the db path is read when the module loads.
  ({ ingestAll } = await import("./ingest"));
  ({ fetchPerformances } = await import("./routes/performances"));
  ({ fetchVenues } = await import("./routes/theaters"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("ingestAll", () => {
  it("stores scraped listings and serves them back in the existing API shape", async () => {
    await useFreshCacheDir();
    mockSources();

    await ingestAll();

    const listings = await fetchPerformances();

    // Ordered by start date by the database, not by scrape order.
    expect(listings.map((listing) => listing.id)).toEqual([
      "glass-menagerie",
      "glass-menagerie-north",
      "https://ntpa.org/events/frozen-jr/",
    ]);

    const glassMenagerie = listings.find((listing) => listing.id === "glass-menagerie");

    expect(glassMenagerie).toMatchObject({
      source: "breaklegs",
      name: "The Glass Menagerie",
      company: "Lakefront Theater",
      tags: ["drama"],
      imageUrl: "https://images.test/glass.jpg",
      listingUrl: "https://goodshow.breaklegs.com/performances/glass-menagerie/",
    });
    expect(glassMenagerie!.startDate).toMatch(/^2026-08-02T/);
    expect(glassMenagerie!.timeOfFetch).toMatch(/Z$/);

    const ntpaListing = listings.find((listing) => listing.source === "NTPA");

    expect(ntpaListing).toMatchObject({
      name: "Frozen Jr.",
      // fetchNTPA prefixes the category list, which is what it has always sent.
      company: "NTPA - Plano Performances ",
      tags: [],
    });
  });

  it("gives one show two listings when it plays at two venues at once", async () => {
    const listings = await fetchPerformances();

    const glassMenagerieListings = listings.filter(
        (listing) => listing.name === "The Glass Menagerie",
    );

    expect(glassMenagerieListings).toHaveLength(2);
    expect(glassMenagerieListings.map((listing) => listing.company)).toEqual([
      "Lakefront Theater",
      "Northside Players",
    ]);
  });

  it("records venues from the sources that publish a directory", async () => {
    const venues = await fetchVenues();

    // NTPA is absent on purpose: its listings carry a category list rather than a theater
    // name, so it contributes no venue rows yet.
    expect(venues.map((venue) => venue.theaterName)).toEqual([
      "Lakefront Theater",
      "Northside Players",
    ]);

    expect(venues.find((venue) => venue.theaterName === "Lakefront Theater")).toMatchObject({
      address: "100 Main St, Richardson, TX",
      website: "https://example.test/lakefront",
    });
  });

  it("is idempotent and drops listings a source stopped publishing", async () => {
    await useFreshCacheDir();
    mockSources(false);

    await ingestAll();

    const listings = await fetchPerformances();

    expect(listings.map((listing) => listing.id)).toEqual([
      "glass-menagerie",
      "https://ntpa.org/events/frozen-jr/",
    ]);

    // The venue whose only listing vanished is kept -- user data will point at venues.
    const venues = await fetchVenues();
    expect(venues.map((venue) => venue.theaterName)).toContain("Northside Players");
  });
});
