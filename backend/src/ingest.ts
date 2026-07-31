import { and, eq, ne } from "drizzle-orm";
import { getDB } from "./db/client";
import { listings, shows, venues } from "./db/schema";
import { getBreakLegPerformances, getBreakLegTheaters } from "./scrapers/fetchBreaklegs";
import { getNTPAPerformances } from "./scrapers/fetchNTPA";
import { Listing, Venue } from "../../models";

interface ScrapedSource {
    listings: Listing[];
    venues: Venue[];
}

/**
 * Compares titles and theater names for identity. Apostrophe style and stray whitespace
 * differ between sources often enough to split rows that should be the same.
 */
export function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

export async function ingestAll(): Promise<void> {
    const runAt = new Date().toISOString();

    await ingestSource("breaklegs", runAt, async () => {
        const [scrapedListings, scrapedVenues] = await Promise.all([
            getBreakLegPerformances(),
            getBreakLegTheaters(),
        ]);

        return { listings: scrapedListings, venues: scrapedVenues };
    });

    // NTPA contributes no venue rows yet, so its listings keep venueId NULL. It publishes
    // no directory page, and the string fetchNTPA puts in `company` is the listing's
    // WordPress category list ("Frisco Performances, Plano Performances"), not a theater.
    // The real venue is the last en-dash segment of the link text -- "1776 - Community
    // Theatre Plano - Rodenbaugh Theatre" -- which fetchNTPA currently discards. Getting
    // NTPA venues into this table is a change to that scraper, not to the schema.
    await ingestSource("NTPA", runAt, async () => ({
        listings: await getNTPAPerformances(),
        venues: [],
    }));
}

async function ingestSource(
    source: string,
    runAt: string,
    scrape: () => Promise<ScrapedSource>,
): Promise<void> {
    try {
        const scraped = await scrape();

        await upsertVenues(source, scraped.venues, runAt);

        const unresolved = await upsertListings(source, scraped.listings, runAt);
        const pruned = await pruneListings(source, runAt);

        console.info(
            `Ingested ${source}: ${scraped.listings.length} listings ` +
            `(${unresolved} without a venue), ${scraped.venues.length} venues, ` +
            `${pruned} stale listings removed`,
        );
    } catch (error) {
        // Isolated per source so a site changing its markup leaves the other sources'
        // rows -- and the previous rows for this source -- in place.
        console.error(`Ingest failed for ${source}, keeping its existing rows:`, error);
    }
}

async function upsertVenues(source: string, scraped: Venue[], runAt: string): Promise<void> {
    const db = getDB();

    for (const venue of scraped) {
        const address = venue.address?.trim() || null;
        const website = venue.website?.trim() || null;

        await db
            .insert(venues)
            .values({
                source,
                sourceId: venue.id,
                name: venue.theaterName,
                normalizedName: normalizeText(venue.theaterName),
                address,
                website,
                firstSeenAt: runAt,
                lastSeenAt: runAt,
            })
            .onConflictDoUpdate({
                target: [venues.source, venues.sourceId],
                set: {
                    name: venue.theaterName,
                    normalizedName: normalizeText(venue.theaterName),
                    lastSeenAt: runAt,
                    // Only written when the scrape actually has a value, so an address
                    // filled in by hand survives every later scrape.
                    ...(address ? { address } : {}),
                    ...(website ? { website } : {}),
                },
            });
    }
}

/** Returns how many listings could not be matched to a venue. */
async function upsertListings(source: string, scraped: Listing[], runAt: string): Promise<number> {
    const db = getDB();
    let unresolved = 0;

    for (const listing of scraped) {
        const showId = await getOrCreateShowId(listing.name, runAt);
        const venueId = await findVenueId(source, listing.company);

        if (venueId === null) unresolved++;

        await db
            .insert(listings)
            .values({
                source,
                sourceId: listing.id,
                showId,
                venueId,
                company: listing.company,
                startDate: listing.startDate,
                endDate: listing.endDate,
                imageUrl: listing.imageUrl,
                listingUrl: listing.listingUrl,
                tags: JSON.stringify(listing.tags),
                firstSeenAt: runAt,
                lastSeenAt: runAt,
            })
            .onConflictDoUpdate({
                target: [listings.source, listings.sourceId],
                set: {
                    showId,
                    venueId,
                    company: listing.company,
                    startDate: listing.startDate,
                    endDate: listing.endDate,
                    imageUrl: listing.imageUrl,
                    listingUrl: listing.listingUrl,
                    tags: JSON.stringify(listing.tags),
                    lastSeenAt: runAt,
                },
            });
    }

    return unresolved;
}

async function getOrCreateShowId(title: string, runAt: string): Promise<number> {
    const db = getDB();
    const normalizedKey = normalizeText(title);

    const [existing] = await db
        .select({ id: shows.id })
        .from(shows)
        .where(eq(shows.normalizedKey, normalizedKey))
        .limit(1);

    if (existing) return existing.id;

    const [created] = await db
        .insert(shows)
        .values({ title: title.trim(), normalizedKey, firstSeenAt: runAt })
        .returning({ id: shows.id });

    return created.id;
}

async function findVenueId(source: string, company: string): Promise<number | null> {
    const db = getDB();

    const [venue] = await db
        .select({ id: venues.id })
        .from(venues)
        .where(and(eq(venues.source, source), eq(venues.normalizedName, normalizeText(company))))
        .limit(1);

    return venue?.id ?? null;
}

/**
 * Removes listings this source stopped publishing, so the API keeps matching the sources
 * instead of accumulating shows that are no longer listed. Only reached when the scrape
 * succeeded. Shows and venues are never pruned: they are what user data will point at.
 */
async function pruneListings(source: string, runAt: string): Promise<number> {
    const db = getDB();

    const removed = await db
        .delete(listings)
        .where(and(eq(listings.source, source), ne(listings.lastSeenAt, runAt)))
        .returning({ id: listings.id });

    return removed.length;
}
