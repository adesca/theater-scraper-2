import { and, eq, like } from "drizzle-orm";
import { getDB } from "./client";
import { venues, watchedTheaters } from "./schema";

export interface WatchedVenue {
    venueId: number;
    name: string;
}

export async function watchVenue(
    discordChannelId: string,
    venueId: number,
): Promise<"watched" | "already-watching"> {
    const db = getDB();

    const [existing] = await db
        .select({ id: watchedTheaters.id })
        .from(watchedTheaters)
        .where(and(eq(watchedTheaters.discordChannelId, discordChannelId), eq(watchedTheaters.venueId, venueId)))
        .limit(1);

    if (existing) return "already-watching";

    await db.insert(watchedTheaters).values({ discordChannelId, venueId, createdAt: new Date().toISOString() });

    return "watched";
}

export async function unwatchVenue(
    discordChannelId: string,
    venueId: number,
): Promise<"unwatched" | "not-watching"> {
    const db = getDB();

    const removed = await db
        .delete(watchedTheaters)
        .where(and(eq(watchedTheaters.discordChannelId, discordChannelId), eq(watchedTheaters.venueId, venueId)))
        .returning({ id: watchedTheaters.id });

    return removed.length > 0 ? "unwatched" : "not-watching";
}

export async function listWatchedVenues(discordChannelId: string): Promise<WatchedVenue[]> {
    const db = getDB();

    return db
        .select({ venueId: venues.id, name: venues.name })
        .from(watchedTheaters)
        .innerJoin(venues, eq(watchedTheaters.venueId, venues.id))
        .where(eq(watchedTheaters.discordChannelId, discordChannelId));
}

/** Venue name matches for slash command autocomplete, not yet watched by this channel. */
export async function searchUnwatchedVenues(
    discordChannelId: string,
    query: string,
    limit: number,
): Promise<WatchedVenue[]> {
    const db = getDB();

    const watchedIds = (await listWatchedVenues(discordChannelId)).map((v) => v.venueId);

    const rows = await db
        .select({ venueId: venues.id, name: venues.name })
        .from(venues)
        .where(like(venues.normalizedName, `%${query.toLowerCase()}%`))
        .limit(limit + watchedIds.length);

    return rows.filter((row) => !watchedIds.includes(row.venueId)).slice(0, limit);
}

/** Venue name matches for slash command autocomplete, restricted to theaters this channel already watches. */
export async function searchWatchedVenues(
    discordChannelId: string,
    query: string,
    limit: number,
): Promise<WatchedVenue[]> {
    const db = getDB();
    const normalized = query.toLowerCase();

    return db
        .select({ venueId: venues.id, name: venues.name })
        .from(watchedTheaters)
        .innerJoin(venues, eq(watchedTheaters.venueId, venues.id))
        .where(and(
            eq(watchedTheaters.discordChannelId, discordChannelId),
            like(venues.normalizedName, `%${normalized}%`),
        ))
        .limit(limit);
}
