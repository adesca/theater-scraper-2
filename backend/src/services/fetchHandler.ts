import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_CACHE_DIR = ".cache/http";

export async function fetchWithDailyCache(
    identifier: string,
    url: string,
    cacheDir = DEFAULT_CACHE_DIR,
): Promise<string> {
    const activeCacheDir = process.env.THEATER_SCRAPER_CACHE_DIR ?? cacheDir;
    await mkdir(activeCacheDir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `${identifier}-${today}`.replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_",
    );
    const cachePath = join(activeCacheDir, `${filename}.html`);

    try {
        return await readFile(cachePath, "utf8");
    } catch {
        console.log(`Cache missed for ${identifier}, fetching fresh response`)
        // Cache miss; fetch a fresh response.
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Request failed (${response.status} ${response.statusText}) for ${url}`,
        );
    }

    const body = await response.text();

    await writeFile(cachePath, body, "utf8");

    return body;
}
