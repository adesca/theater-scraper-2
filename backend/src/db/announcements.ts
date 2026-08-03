import { and, eq } from "drizzle-orm";
import { getDB } from "./client";
import { announcements, announcementThreadInterest } from "./schema";

export interface RecordAnnouncementInput {
    performanceId: number;
    type: string;
    discordChannelId: string;
    discordMessageId: string;
    sourceUrl: string;
    websiteUrl: string;
}

export async function hasAnnounced(
    performanceId: number,
    type: string,
    discordChannelId: string,
): Promise<boolean> {
    const db = getDB();

    const [existing] = await db
        .select({ id: announcements.id })
        .from(announcements)
        .where(and(
            eq(announcements.performanceId, performanceId),
            eq(announcements.type, type),
            eq(announcements.discordChannelId, discordChannelId),
        ))
        .limit(1);

    return !!existing;
}

/**
 * Insert, or update in place on a (performance, type, channel) conflict. The generation
 * service always checks `hasAnnounced()` first, so this should only ever hit the update
 * path if two generate runs raced on the same candidate -- a defensive fallback, not a
 * feature. If it ever fires, the write is a new Discord message, so `discordThreadId`
 * resets to null: any thread on the previous message has nothing to do with this one.
 */
export async function recordAnnouncement(input: RecordAnnouncementInput): Promise<{ id: number }> {
    const db = getDB();
    const announcedAt = new Date().toISOString();

    const [created] = await db
        .insert(announcements)
        .values({ ...input, announcedAt })
        .onConflictDoUpdate({
            target: [announcements.performanceId, announcements.type, announcements.discordChannelId],
            set: {
                discordMessageId: input.discordMessageId,
                discordThreadId: null,
                sourceUrl: input.sourceUrl,
                websiteUrl: input.websiteUrl,
                announcedAt,
            },
        })
        .returning({ id: announcements.id });

    // A resend's message starts with zero reactions, so any interest recorded against
    // the previous message no longer applies. A no-op on the (usual) plain-insert path,
    // since nothing references a brand new announcement id yet.
    await db.delete(announcementThreadInterest).where(eq(announcementThreadInterest.announcementId, created.id));

    return created;
}

export async function getAnnouncementByMessageId(
    discordMessageId: string,
): Promise<{ id: number; discordThreadId: string | null } | undefined> {
    const db = getDB();

    const [announcement] = await db
        .select({ id: announcements.id, discordThreadId: announcements.discordThreadId })
        .from(announcements)
        .where(eq(announcements.discordMessageId, discordMessageId))
        .limit(1);

    return announcement;
}

export async function setAnnouncementThreadId(announcementId: number, discordThreadId: string): Promise<void> {
    const db = getDB();

    await db
        .update(announcements)
        .set({ discordThreadId })
        .where(eq(announcements.id, announcementId));
}

/** Records a user's 🧵 reaction and returns how many unique users have reacted so far. */
export async function addThreadInterest(announcementId: number, discordUserId: string): Promise<number> {
    const db = getDB();

    await db
        .insert(announcementThreadInterest)
        .values({ announcementId, discordUserId, reactedAt: new Date().toISOString() })
        .onConflictDoNothing();

    const interested = await db
        .select({ id: announcementThreadInterest.id })
        .from(announcementThreadInterest)
        .where(eq(announcementThreadInterest.announcementId, announcementId));

    return interested.length;
}
