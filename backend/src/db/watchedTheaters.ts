import { and, asc, eq } from "drizzle-orm";
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

/** All known theaters, for the /watch-theater multi-select editor. */
export async function listAllVenues(): Promise<WatchedVenue[]> {
    const db = getDB();

    return db
        .select({ venueId: venues.id, name: venues.name })
        .from(venues)
        .orderBy(asc(venues.name));
}
