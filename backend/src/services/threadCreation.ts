import { Message, ThreadAutoArchiveDuration } from "discord.js";
import { getAnnouncementByMessageId, setAnnouncementThreadId } from "../db/announcements";
import { client } from "../notifications/discord/client";

export interface ThreadCreationCandidate {
    announcementId: number;
    channelId: string;
    messageId: string;
    proposedThreadName: string;
    alreadyHasThread: boolean;
    existingThreadId: string | null;
}

export type ThreadLookupError =
    | { status: "not-an-announcement" }
    | { status: "channel-unavailable" }
    | { status: "message-unavailable" };

export type ThreadCreationOutcome =
    | { status: "created"; threadId: string }
    | { status: "already-exists"; threadId: string }
    | ThreadLookupError;

interface ResolvedAnnouncementMessage {
    announcementId: number;
    discordThreadId: string | null;
    message: Message;
}

/**
 * Shared by both callers: the organic 🧵-reaction flow (notifications/discord/reactions.ts,
 * gated on 3 interested users) and the `/debug` "Thread Creation" preview/trigger flow
 * (which bypasses that gate on purpose). Neither duplicates this lookup or the creation
 * logic below it.
 */
async function resolveAnnouncementMessage(
    channelId: string,
    messageId: string,
): Promise<ResolvedAnnouncementMessage | ThreadLookupError> {
    const announcement = await getAnnouncementByMessageId(messageId);
    if (!announcement) return { status: "not-an-announcement" };

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return { status: "channel-unavailable" };

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return { status: "message-unavailable" };

    return { announcementId: announcement.id, discordThreadId: announcement.discordThreadId, message };
}

/** Describes what creating a thread on this announcement message would do, without doing it. */
export async function findThreadCreationCandidate(
    channelId: string,
    messageId: string,
): Promise<ThreadCreationCandidate | ThreadLookupError> {
    const resolved = await resolveAnnouncementMessage(channelId, messageId);
    if ("status" in resolved) return resolved;

    return {
        announcementId: resolved.announcementId,
        channelId,
        messageId,
        proposedThreadName: deriveThreadName(resolved.message.content),
        alreadyHasThread: resolved.discordThreadId !== null,
        existingThreadId: resolved.discordThreadId,
    };
}

/** Creates the thread (or reports it already exists) and records the result. */
export async function createThreadForAnnouncement(
    channelId: string,
    messageId: string,
): Promise<ThreadCreationOutcome> {
    const resolved = await resolveAnnouncementMessage(channelId, messageId);
    if ("status" in resolved) return resolved;

    if (resolved.discordThreadId) {
        return { status: "already-exists", threadId: resolved.discordThreadId };
    }

    // Discord-side state wins over our DB's: a concurrent reaction-triggered creation
    // may have started a thread before this call recorded one.
    if (resolved.message.thread) {
        await setAnnouncementThreadId(resolved.announcementId, resolved.message.thread.id);
        return { status: "already-exists", threadId: resolved.message.thread.id };
    }

    const thread = await resolved.message.startThread({
        name: deriveThreadName(resolved.message.content),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    });

    await thread.send("🧵 Discussion thread started — join in!");
    await setAnnouncementThreadId(resolved.announcementId, thread.id);

    return { status: "created", threadId: thread.id };
}

function deriveThreadName(messageContent: string): string {
    const titleLine = messageContent.split("\n").find((line) => line.startsWith("**") && line.endsWith("**"));
    const title = titleLine?.replace(/\*\*/g, "").trim();

    return (title ? `Discussion: ${title}` : "Discussion").slice(0, 100);
}
