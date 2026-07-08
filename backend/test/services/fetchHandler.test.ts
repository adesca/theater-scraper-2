import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fetchWithDailyCache } from '../../src/services/fetchHandler';

const originalFetch = globalThis.fetch;
const tempDirs: string[] = [];

afterEach(async () => {
  globalThis.fetch = originalFetch;

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempCacheDir() {
  const dir = await mkdtemp(join(tmpdir(), 'theater-scraper-cache-test-'));
  tempDirs.push(dir);
  return dir;
}

test('fetches fresh data once per day and reuses the cached response on the second request', async () => {
  const cacheDir = await makeTempCacheDir();
  const fetchCalls: string[] = [];

  globalThis.fetch = async (input) => {
    fetchCalls.push(String(input));

    return new Response('<html>fresh response</html>', {
      status: 200,
      statusText: 'OK',
    });
  };

  const firstResponse = await fetchWithDailyCache(
    'breaklegs-performances',
    'https://example.test/performances',
    cacheDir,
  );
  const secondResponse = await fetchWithDailyCache(
    'breaklegs-performances',
    'https://example.test/performances',
    cacheDir,
  );

  assert.equal(firstResponse, '<html>fresh response</html>');
  assert.equal(secondResponse, '<html>fresh response</html>');
  assert.deepEqual(fetchCalls, ['https://example.test/performances']);
});

test('writes fetched data to a daily cache file with a sanitized identifier', async () => {
  const cacheDir = await makeTempCacheDir();

  globalThis.fetch = async () =>
    new Response('cached body', {
      status: 200,
      statusText: 'OK',
    });

  await fetchWithDailyCache(
    'bad/path:identifier',
    'https://example.test/performances',
    cacheDir,
  );

  const today = new Date().toISOString().slice(0, 10);
  const cachedBody = await readFile(
    join(cacheDir, `bad_path_identifier-${today}.html`),
    'utf8',
  );

  assert.equal(cachedBody, 'cached body');
});

test('throws when the external request fails', async () => {
  const cacheDir = await makeTempCacheDir();

  globalThis.fetch = async () =>
    new Response('nope', {
      status: 503,
      statusText: 'Service Unavailable',
    });

  await assert.rejects(
    fetchWithDailyCache(
      'breaklegs-performances',
      'https://example.test/performances',
      cacheDir,
    ),
    /Request failed \(503 Service Unavailable\) for https:\/\/example\.test\/performances/,
  );
});
