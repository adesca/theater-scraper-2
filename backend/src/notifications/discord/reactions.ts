import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { addThreadInterest, getAnnouncementByMessageId } from "../../db/announcements";
import { createThreadForAnnouncement } from "../../services/threadCreation";
import { client } from "./client";

const THREAD_EMOJI = "🧵";
const THREAD_CREATION_THRESHOLD = 3;

export async function handleThreadReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
): Promise<void> {
    if (reaction.emoji.name !== THREAD_EMOJI) return;

    const announcement = await getAnnouncementByMessageId(reaction.message.id);
    if (!announcement) return;

    const interestedCount = await addThreadInterest(announcement.id, user.id);

    // Already has a thread: later reactors just get welcomed into the existing one
    // instead of triggering another creation attempt.
    if (announcement.discordThreadId) {
        await welcomeIntoExistingThread(announcement.discordThreadId, user);
        return;
    }

    if (interestedCount < THREAD_CREATION_THRESHOLD) return;

    // Same creation logic the `/debug` "Trigger Thread Creation" flow uses, just gated
    // here on the 3-interested-user threshold instead of an admin's explicit Run press.
    await createThreadForAnnouncement(reaction.message.channelId, reaction.message.id);
}

async function welcomeIntoExistingThread(threadId: string, user: User | PartialUser): Promise<void> {
    // Best-effort: if the thread was deleted or the bot lacks access, there's nothing
    // else to do for this reaction.
    const thread = await client.channels.fetch(threadId).catch(() => null);
    if (!thread?.isSendable()) return;

    await thread.send(`👋 <@${user.id}>, join the discussion!`).catch((error: unknown) => {
        console.error(`Failed to welcome user into thread ${threadId}:`, error);
    });
}
