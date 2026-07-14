import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getBreakLegPerformances } from "../../../src/routes/fetchBreaklegs";

const originalFetch = globalThis.fetch;
const originalCacheDir = process.env.THEATER_SCRAPER_CACHE_DIR;
const tempDirs: string[] = [];

afterEach(async () => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();

  if (originalCacheDir === undefined) {
    delete process.env.THEATER_SCRAPER_CACHE_DIR;
  } else {
    process.env.THEATER_SCRAPER_CACHE_DIR = originalCacheDir;
  }

  await Promise.all(
      tempDirs.splice(0).map((dir) =>
          rm(dir, { recursive: true, force: true }),
      ),
  );
});

async function useTempCacheDir() {
  const dir = await mkdtemp(
      join(tmpdir(), "theater-scraper-performances-test-"),
  );

  tempDirs.push(dir);
  process.env.THEATER_SCRAPER_CACHE_DIR = dir;
}

const performancesHtml = String.raw`
<!doctype html>
<html>
  <body>
    <ul class="listings">
      <li data-id="single-performance">
        <span class="image" style="background-image: url('https://images.test/single.jpg')"></span>
        <span class="text">One Night Only</span>
        <span class="detail-text">Downtown Theater</span>
        <span class="dates">Runs July 4</span>
        <span class="filters"><span>solo</span><span>music</span></span>
      </li>
      <li data-id="range-performance">
        <span class="image"></span>
        <span class="text">Summer Comedy</span>
        <span class="detail-text">Northside Players</span>
        <span class="dates">Runs August 2 - 9</span>
        <span class="filters"><span>comedy</span></span>
      </li>
      <li data-id="cross-month-performance">
        <span class="image"></span>
        <span class="text">Fall Drama</span>
        <span class="detail-text">Lakefront Stage</span>
        <span class="dates">Runs September 28 - October 3</span>
        <span class="filters"></span>
      </li>
    </ul>
  </body>
</html>
`;

describe("getBreakLegPerformances", () => {
  it("parses BreakLeg performance listings from the external HTML", async () => {
    await useTempCacheDir();

    globalThis.fetch = vi.fn(async () => {
      return new Response(performancesHtml, {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    });

    const listings = await getBreakLegPerformances();

    expect(listings).toHaveLength(3);

    expect(listings.map((listing) => listing.name)).toEqual([
      "One Night Only",
      "Summer Comedy",
      "Fall Drama",
    ]);

    expect(listings[0].company).toBe("Downtown Theater");
    expect(listings[0].id).toBe("single-performance");
    expect(listings[0].tags).toEqual(["solo", "music"]);
    expect(listings[0].imageUrl).toBe(
        "https://images.test/single.jpg",
    );
    expect(listings[0].startDate).toMatch(/^2026-07-04T/);
    expect(listings[0].endDate).toBe(listings[0].startDate);

    expect(listings[1].company).toBe("Northside Players");
    expect(listings[1].startDate).toMatch(/^2026-08-02T/);
    expect(listings[1].endDate).toMatch(/^2026-08-09T/);

    expect(listings[2].company).toBe("Lakefront Stage");
    expect(listings[2].startDate).toMatch(/^2026-09-28T/);
    expect(listings[2].endDate).toMatch(/^2026-10-03T/);
  });

  it("reuses cached BreakLeg HTML after the first parser request", async () => {
    await useTempCacheDir();

    globalThis.fetch = vi.fn(async () => {
      return new Response(performancesHtml, {
        status: 200,
        statusText: "OK",
      });
    });

    const firstListings = await getBreakLegPerformances();
    const secondListings = await getBreakLegPerformances();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(secondListings).toEqual(firstListings);
  });
});