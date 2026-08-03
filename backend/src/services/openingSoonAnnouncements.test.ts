import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDirs: string[] = [];
const sentMessages: Array<{ channelId: string; content: string }> = [];

vi.mock("../notifications/discord/client", () => ({
    client: {
        channels: {
            fetch: vi.fn(async (channelId: string) => ({
                isTextBased: () => true,
                isSendable: () => true,
                send: vi.fn(async (content: string) => {
                    sentMessages.push({ channelId, content });
                    return { id: `msg-${sentMessages.length}`, react: vi.fn(async () => {}) };
                }),
            })),
        },
    },
    ensureReady: vi.fn(async () => ({ status: "ready" })),
}));

let generateOpeningSoonAnnouncements: typeof import("./openingSoonAnnouncements").generateOpeningSoonAnnouncements;
let findPendingOpeningSoonAnnouncements: typeof import("./openingSoonAnnouncements").findPendingOpeningSoonAnnouncements;
let getDB: typeof import("../db/client").getDB;
let schema: typeof import("../db/schema");
let watchVenue: typeof import("../db/watchedTheaters").watchVenue;
let subscribeChannel: typeof import("../db/subscribedChannels").subscribeChannel;

let nextId = 0;
function uniqueId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${nextId}`;
}

async function seedListing(startDate: Date): Promise<{ venueId: number; venueName: string; listingId: number }> {
    const db = getDB();
    const now = new Date().toISOString();
    const venueSourceId = uniqueId("venue");

    const [venue] = await db.insert(schema.venues).values({
        source: "test",
        sourceId: venueSourceId,
        name: `Theater ${venueSourceId}`,
        normalizedName: `theater ${venueSourceId}`,
        firstSeenAt: now,
        lastSeenAt: now,
    }).returning({ id: schema.venues.id, name: schema.venues.name });

    const showKey = uniqueId("show");
    const [show] = await db.insert(schema.shows).values({
        title: `Show ${showKey}`,
        normalizedKey: `show ${showKey}`,
        firstSeenAt: now,
    }).returning({ id: schema.shows.id });

    const [listing] = await db.insert(schema.listings).values({
        source: "test",
        sourceId: uniqueId("listing"),
        showId: show.id,
        venueId: venue.id,
        company: venue.name,
        startDate: startDate.toISOString(),
        endDate: startDate.toISOString(),
        listingUrl: "https://example.test/listing",
        firstSeenAt: now,
        lastSeenAt: now,
    }).returning({ id: schema.listings.id });

    return { venueId: venue.id, venueName: venue.name, listingId: listing.id };
}

function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// A fresh db per test: generateOpeningSoonAnnouncements() acts on *every* watched
// theater/subscribed channel, so leftover state from a previous test would make later
// tests' assertions about exact counts order-dependent.
beforeEach(async () => {
    vi.resetModules();

    const dbDir = await mkdtemp(join(tmpdir(), "theater-scraper-announcements-db-"));
    tempDirs.push(dbDir);
    process.env.THEATER_SCRAPER_DB_FILE = join(dbDir, "test.db");

    ({ generateOpeningSoonAnnouncements, findPendingOpeningSoonAnnouncements } = await import("./openingSoonAnnouncements"));
    ({ getDB } = await import("../db/client"));
    schema = await import("../db/schema");
    ({ watchVenue } = await import("../db/watchedTheaters"));
    ({ subscribeChannel } = await import("../db/subscribedChannels"));
});

afterEach(() => {
    sentMessages.length = 0;
});

afterAll(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("generateOpeningSoonAnnouncements", () => {
    it("sends nothing when no channel is subscribed", async () => {
        const { venueId } = await seedListing(daysFromNow(5));
        await watchVenue(uniqueId("channel"), venueId);

        const result = await generateOpeningSoonAnnouncements();

        expect(result.announcementsSent).toBe(0);
        expect(sentMessages).toHaveLength(0);
    });

    it("does not announce a listing at an unwatched theater", async () => {
        await seedListing(daysFromNow(5));
        await subscribeChannel(uniqueId("channel"));

        const result = await generateOpeningSoonAnnouncements();

        expect(sentMessages).toHaveLength(0);
        expect(result.announcementsSent).toBe(0);
    });

    it("does not announce a listing opening more than 14 days out", async () => {
        const { venueId } = await seedListing(daysFromNow(20));
        const channelId = uniqueId("channel");
        await watchVenue(channelId, venueId);
        await subscribeChannel(channelId);

        const result = await generateOpeningSoonAnnouncements();

        expect(sentMessages).toHaveLength(0);
        expect(result.announcementsSent).toBe(0);
    });

    it("sends and records an announcement once, and never again on a later run", async () => {
        const { venueId } = await seedListing(daysFromNow(5));
        const channelId = uniqueId("channel");
        await watchVenue(channelId, venueId);
        await subscribeChannel(channelId);

        const first = await generateOpeningSoonAnnouncements();
        expect(first.announcementsSent).toBe(1);
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0].channelId).toBe(channelId);

        sentMessages.length = 0;
        const second = await generateOpeningSoonAnnouncements();

        expect(second.announcementsSent).toBe(0);
        expect(sentMessages).toHaveLength(0);
    });

    it("uses referenceDate to shift the 14-day window instead of the real clock", async () => {
        const { venueId } = await seedListing(daysFromNow(20));
        const channelId = uniqueId("channel");
        await watchVenue(channelId, venueId);
        await subscribeChannel(channelId);

        const real = await generateOpeningSoonAnnouncements();
        expect(real.announcementsSent).toBe(0);
        expect(sentMessages).toHaveLength(0);

        const shifted = await generateOpeningSoonAnnouncements({ referenceDate: daysFromNow(10) });
        expect(shifted.announcementsSent).toBe(1);
        expect(sentMessages).toHaveLength(1);
    });

    it("still enforces dedupe even when referenceDate simulates a different day", async () => {
        const { venueId } = await seedListing(daysFromNow(5));
        const channelId = uniqueId("channel");
        await watchVenue(channelId, venueId);
        await subscribeChannel(channelId);

        await generateOpeningSoonAnnouncements();
        sentMessages.length = 0;

        // Replaces the old ignoreAlreadyAnnounced bypass: simulating a different "today"
        // still can't resend a performance/channel pair that's already been announced.
        const result = await generateOpeningSoonAnnouncements({ referenceDate: daysFromNow(1) });

        expect(result.announcementsSent).toBe(0);
        expect(sentMessages).toHaveLength(0);
    });

    it("does not cross-announce: a channel only hears about theaters watched in that channel", async () => {
        const theaterA = await seedListing(daysFromNow(5));
        const theaterB = await seedListing(daysFromNow(6));
        const channelA = uniqueId("channel");
        const channelB = uniqueId("channel");

        await watchVenue(channelA, theaterA.venueId);
        await subscribeChannel(channelA);
        await watchVenue(channelB, theaterB.venueId);
        await subscribeChannel(channelB);

        const result = await generateOpeningSoonAnnouncements();

        expect(result.announcementsSent).toBe(2);
        expect(sentMessages).toHaveLength(2);

        const sentToA = sentMessages.filter((m) => m.channelId === channelA);
        const sentToB = sentMessages.filter((m) => m.channelId === channelB);
        expect(sentToA).toHaveLength(1);
        expect(sentToB).toHaveLength(1);
        // Each channel only heard about the theater watched in that same channel.
        expect(sentToA[0].content).toContain(theaterA.venueName);
        expect(sentToA[0].content).not.toContain(theaterB.venueName);
        expect(sentToB[0].content).toContain(theaterB.venueName);
        expect(sentToB[0].content).not.toContain(theaterA.venueName);
    });
});

describe("findPendingOpeningSoonAnnouncements", () => {
    it("reflects exactly what generateOpeningSoonAnnouncements would send, before and after sending", async () => {
        const { venueId } = await seedListing(daysFromNow(5));
        const channelId = uniqueId("channel");
        await watchVenue(channelId, venueId);
        await subscribeChannel(channelId);

        expect(await findPendingOpeningSoonAnnouncements()).toHaveLength(1);

        await generateOpeningSoonAnnouncements();

        expect(await findPendingOpeningSoonAnnouncements()).toHaveLength(0);
    });
});
