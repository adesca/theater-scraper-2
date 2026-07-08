import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { getBreakLegPerformances } from '../../../src/routes/performances/fetchPerformances';

const originalFetch = globalThis.fetch;
const originalCacheDir = process.env.THEATER_SCRAPER_CACHE_DIR;
const tempDirs: string[] = [];

afterEach(async () => {
  globalThis.fetch = originalFetch;

  if (originalCacheDir === undefined) {
    delete process.env.THEATER_SCRAPER_CACHE_DIR;
  } else {
    process.env.THEATER_SCRAPER_CACHE_DIR = originalCacheDir;
  }

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function useTempCacheDir() {
  const dir = await mkdtemp(join(tmpdir(), 'theater-scraper-performances-test-'));
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

test('parses BreakLeg performance listings from the external HTML', async () => {
  await useTempCacheDir();

  globalThis.fetch = async () =>
    new Response(performancesHtml, {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });

  const listings = await getBreakLegPerformances();

  assert.equal(listings.length, 3);
  assert.deepEqual(
    listings.map((listing) => listing.name),
    ['One Night Only', 'Summer Comedy', 'Fall Drama'],
  );
  assert.equal(listings[0].company, 'Downtown Theater');
  assert.equal(listings[0].id, 'single-performance');
  assert.deepEqual(listings[0].tags, ['solo', 'music']);
  assert.equal(listings[0].imageUrl, 'https://images.test/single.jpg');
  assert.match(listings[0].startDate, /^2026-07-04T/);
  assert.equal(listings[0].endDate, listings[0].startDate);

  assert.equal(listings[1].company, 'Northside Players');
  assert.match(listings[1].startDate, /^2026-08-02T/);
  assert.match(listings[1].endDate, /^2026-08-09T/);

  assert.equal(listings[2].company, 'Lakefront Stage');
  assert.match(listings[2].startDate, /^2026-09-28T/);
  assert.match(listings[2].endDate, /^2026-10-03T/);
});

test('reuses cached BreakLeg HTML after the first parser request', async () => {
  await useTempCacheDir();
  let fetchCount = 0;

  globalThis.fetch = async () => {
    fetchCount += 1;

    return new Response(performancesHtml, {
      status: 200,
      statusText: 'OK',
    });
  };

  const firstListings = await getBreakLegPerformances();
  const secondListings = await getBreakLegPerformances();

  assert.equal(fetchCount, 1);
  assert.deepEqual(secondListings, firstListings);
});
