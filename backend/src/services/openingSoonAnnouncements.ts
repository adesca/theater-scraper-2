import { and, eq, gte, lte } from "drizzle-orm";
import { format } from "date-fns";
import { getDB } from "../db/client";
import { listings, shows, subscribedChannels, venues, watchedTheaters } from "../db/schema";
import { hasAnnounced, recordAnnouncement } from "../db/announcements";
import { client, ensureReady } from "../notifications/discord/client";
import { FRONTEND_URL } from "../constants";

// The `announcements` table already carries a `type` column for this reason: future kinds
// (closing_soon, newly_announced, follow_play, follow_theater, email, website "What's New")
// can each get their own generate<Type>Announcements() function with its own qualifying
// query and message builder, sharing recordAnnouncement()/hasAnnounced() and the
// subscribed_channels table with this one.
export const OPENING_SOON_TYPE = "opening_soon";

const OPENING_SOON_WINDOW_DAYS = 14;

export interface OpeningSoonCandidate {
    listingId: number;
    discordChannelId: string;
    showTitle: string;
    venueName: string;
    startDate: string;
    endDate: string;
    listingUrl: string;
}

export interface GenerateOpeningSoonResult {
    announcementsSent: number;
}

/**
 * Finds performances opening within 14 days of `referenceDate` at a theater some channel
 * watches. Watches are joined per-channel (not just per-theater) so a channel only ever
 * hears about theaters watched in that same channel, not ones watched by other servers.
 * `referenceDate` defaults to now, but the `/debug` UI's "what if today were X" flows pass
 * a different date to simulate the window without touching the clock.
 */
export async function findOpeningSoonCandidates(referenceDate: Date = new Date()): Promise<OpeningSoonCandidate[]> {
    const db = getDB();
    const windowEnd = new Date(referenceDate.getTime() + OPENING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    return db
        .select({
            listingId: listings.id,
            discordChannelId: watchedTheaters.discordChannelId,
            showTitle: shows.title,
            venueName: venues.name,
            startDate: listings.startDate,
            endDate: listings.endDate,
            listingUrl: listings.listingUrl,
        })
        .from(watchedTheaters)
        .innerJoin(venues, eq(watchedTheaters.venueId, venues.id))
        .innerJoin(listings, eq(listings.venueId, venues.id))
        .innerJoin(shows, eq(listings.showId, shows.id))
        .innerJoin(subscribedChannels, eq(subscribedChannels.discordChannelId, watchedTheaters.discordChannelId))
        .where(and(
            gte(listings.startDate, referenceDate.toISOString()),
            lte(listings.startDate, windowEnd.toISOString()),
        ));
}

/** `findOpeningSoonCandidates()` filtered down to what generateOpeningSoonAnnouncements() would actually send. */
export async function findPendingOpeningSoonAnnouncements(
    referenceDate: Date = new Date(),
): Promise<OpeningSoonCandidate[]> {
    const candidates = await findOpeningSoonCandidates(referenceDate);
    const pending: OpeningSoonCandidate[] = [];

    for (const candidate of candidates) {
        const alreadyAnnounced = await hasAnnounced(candidate.listingId, OPENING_SOON_TYPE, candidate.discordChannelId);
        if (!alreadyAnnounced) pending.push(candidate);
    }

    return pending;
}

/**
 * Sends a Discord announcement (recording it afterward) for every pending candidate.
 * Reused as-is by the nightly scrape flow and by `/debug`'s "Trigger Coming Soon" --
 * `referenceDate` is the only thing that ever differs between callers, and since dedupe
 * is always enforced, shifting it can never resend something already announced.
 */
export async function generateOpeningSoonAnnouncements(
    options: { referenceDate?: Date } = {},
): Promise<GenerateOpeningSoonResult> {
    const pending = await findPendingOpeningSoonAnnouncements(options.referenceDate);
    let announcementsSent = 0;

    for (const candidate of pending) {
        const message = await sendOpeningSoonMessage(candidate.discordChannelId, candidate);
        // Send failed (bot down, channel gone, missing permissions, ...): nothing is
        // recorded, so the next scrape run will simply try this pairing again.
        if (!message) continue;

        await recordAnnouncement({
            performanceId: candidate.listingId,
            type: OPENING_SOON_TYPE,
            discordChannelId: candidate.discordChannelId,
            discordMessageId: message.id,
            sourceUrl: candidate.listingUrl,
            websiteUrl: buildTheaterDeepLink(candidate.venueName),
        });

        announcementsSent++;
    }

    return { announcementsSent };
}

async function sendOpeningSoonMessage(channelId: string, candidate: OpeningSoonCandidate) {
    const status = await ensureReady();
    if (status.status === "down") return null;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !channel.isSendable()) {
        console.error(`Cannot send opening-soon announcement: channel ${channelId} is missing or not sendable`);
        return null;
    }

    const content = buildOpeningSoonMessage(candidate);
    const message = await channel.send(content).catch((error: unknown) => {
        console.error(`Failed to send opening-soon announcement to channel ${channelId}:`, error);
        return null;
    });

    if (!message) return null;

    // Seeded so users only have to click, not type an emoji. 🧵 is the only reaction with
    // behavior wired up (see notifications/discord/reactions.ts) -- 🔔 (follow this
    // production) and 🏛️ (follow this theater) aren't seeded yet since they wouldn't do
    // anything if clicked; add them back here once those features exist.
    await Promise.all([
        message.react("🧵"),
    ]).catch((error: unknown) => console.error("Failed to seed reactions on announcement message:", error));

    return message;
}

function buildOpeningSoonMessage(candidate: OpeningSoonCandidate): string {
    const dateRange = formatDateRange(candidate.startDate, candidate.endDate);
    const websiteUrl = buildTheaterDeepLink(candidate.venueName);

    return [
        `🎭 **Opening Soon**`,
        ``,
        `**${candidate.showTitle}**`,
        // TODO: Read the play description from `shows` once that column exists. If
        // missing, import it from a future source and persist it there before sending.
        `📍 ${candidate.venueName}`,
        `🗓 ${dateRange}`,
        ``,
        `🎟 [Official tickets](${candidate.listingUrl})`,
        `🔎 [Explore more shows at ${candidate.venueName}](${websiteUrl})`,
        ``,
        `────────────────────────`,
        `React below:`,
        `🧵 Create or join a thread`,
        `_(Thread is automatically created once at least 3 people react.)_`,
    ].join("\n");
}

function formatDateRange(startDateIso: string, endDateIso: string): string {
    const start = format(new Date(startDateIso), "MMMM d");
    const end = format(new Date(endDateIso), "MMMM d");

    return start === end ? start : `${start} – ${end}`;
}

function buildTheaterDeepLink(venueName: string): string {
    return `${FRONTEND_URL}/?searchString=${encodeURIComponent(venueName)}`;
}
