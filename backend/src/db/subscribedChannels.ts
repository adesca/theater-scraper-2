import { eq } from "drizzle-orm";
import { getDB } from "./client";
import { subscribedChannels } from "./schema";

export async function subscribeChannel(discordChannelId: string): Promise<"subscribed" | "already-subscribed"> {
    const db = getDB();

    const [existing] = await db
        .select({ id: subscribedChannels.id })
        .from(subscribedChannels)
        .where(eq(subscribedChannels.discordChannelId, discordChannelId))
        .limit(1);

    if (existing) return "already-subscribed";

    await db.insert(subscribedChannels).values({
        discordChannelId,
        createdAt: new Date().toISOString(),
    });

    return "subscribed";
}

export async function unsubscribeChannel(discordChannelId: string): Promise<"unsubscribed" | "not-subscribed"> {
    const db = getDB();

    const removed = await db
        .delete(subscribedChannels)
        .where(eq(subscribedChannels.discordChannelId, discordChannelId))
        .returning({ id: subscribedChannels.id });

    return removed.length > 0 ? "unsubscribed" : "not-subscribed";
}
