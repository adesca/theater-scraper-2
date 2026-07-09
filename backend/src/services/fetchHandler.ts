import { createHash } from "node:crypto";
import {
    mkdir,
    readFile,
    stat,
    writeFile,
} from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_CACHE_DIR = ".cache/http";

export interface CachedResponse {
    body: string;
    cachedAt: Date;
}

function hashUrl(url: string): string {
    return createHash("sha256").update(url).digest("hex");
}

function isSameUtcDay(a: Date, b: Date): boolean {
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export async function fetchWithDailyCache(
    url: string,
    cacheDir = DEFAULT_CACHE_DIR,
): Promise<CachedResponse> {
    const activeCacheDir = process.env.THEATER_SCRAPER_CACHE_DIR ?? cacheDir;

    await mkdir(activeCacheDir, { recursive: true });
    console.log('hash', hashUrl(url))

    const cachePath = join(activeCacheDir, `${hashUrl(url)}.html`);

    try {
        const fileStats = await stat(cachePath);

        if (isSameUtcDay(fileStats.mtime, new Date())) {
            return {
                body: await readFile(cachePath, "utf8"),
                cachedAt: fileStats.mtime,
            };
        }
    } catch {
        // Cache miss or file doesn't exist.
    }

    console.log(`Cache miss for ${url}, fetching fresh response`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Request failed (${response.status} ${response.statusText}) for ${url}`,
        );
    }

    const body = await response.text();

    await writeFile(cachePath, body, "utf8");

    const fileStats = await stat(cachePath);

    return {
        body,
        cachedAt: fileStats.mtime,
    };
}