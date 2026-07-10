import { afterEach, describe, expect, it, vi } from "vitest";
import {mkdtemp, readFile, rm, stat} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { fetchWithDailyCache } from "../../src/services/fetchHandler";
console.trace('hi')

 const originalFetch = globalThis.fetch;
 const tempDirs: string[] = [];

 afterEach(async () => {
   globalThis.fetch = originalFetch;
   vi.restoreAllMocks();

   await Promise.all(
       tempDirs.splice(0).map((dir) =>
           rm(dir, { recursive: true, force: true }),
       ),
   );
 });

 async function makeTempCacheDir() {
   const dir = await mkdtemp(join(tmpdir(), "theater-scraper-cache-test-"));
   tempDirs.push(dir);
   return dir;
 }

 function hashUrl(url: string) {
   return createHash("sha256").update(url).digest("hex");
 }

describe("fetchWithDailyCache", () => {
  it("fetches fresh data once per day and reuses the cached response on the second request", async () => {
    const cacheDir = await makeTempCacheDir();

    globalThis.fetch = vi.fn(async () => {
      return new Response("<html>fresh response</html>", {
        status: 200,
        statusText: "OK",
      });
    });

    const url = "https://example.test/performances";

    const firstResponse = await fetchWithDailyCache(url, cacheDir);
    const secondResponse = await fetchWithDailyCache(url, cacheDir);

    expect(firstResponse.body).toBe("<html>fresh response</html>");
    expect(secondResponse.body).toBe("<html>fresh response</html>");

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(url);
  });

  it("writes fetched data to the cache", async () => {
    const cacheDir = await makeTempCacheDir();

    globalThis.fetch = vi.fn(async () => {
      return new Response("cached body", {
        status: 200,
        statusText: "OK",
      });
    });

    const url = "https://example.test/performances";

    console.log(cacheDir)
    await fetchWithDailyCache(url, cacheDir);

    const cachedBody = await readFile(
        join(cacheDir, `${hashUrl(url)}.html`),
        "utf8",
    );

    expect(cachedBody).toBe("cached body");
  });

  it("returns the cache creation time", async () => {
     const cacheDir = await makeTempCacheDir();

     globalThis.fetch = vi.fn(async () => {
       return new Response("cached body", {
         status: 200,
         statusText: "OK",
       });
     });

     const { cachedAt } = await fetchWithDailyCache(
         "https://example.test/performances",
         cacheDir,
     );

     const stats = await stat(join(cacheDir, `${hashUrl("https://example.test/performances")}.html`));
     expect(cachedAt.getTime()).toBe(stats.mtime.getTime());
  });

   it("throws when the external request fails", async () => {
     const cacheDir = await makeTempCacheDir();

     globalThis.fetch = vi.fn(async () => {
       return new Response("nope", {
         status: 503,
         statusText: "Service Unavailable",
       });
     });

     await expect(
         fetchWithDailyCache(
             "https://example.test/performances",
             cacheDir,
         ),
     ).rejects.toThrow(
         "Request failed (503 Service Unavailable) for https://example.test/performances",
     );
   });
});