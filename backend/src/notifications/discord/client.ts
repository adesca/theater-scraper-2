import {
    Client,
    Events,
    GatewayIntentBits,
    Partials,
} from "discord.js";

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

export type DiscordStatus =
    | { status: "ready" }
    | { status: "down" };

let readyPromise: Promise<DiscordStatus> | undefined;

export async function startDiscordBot(): Promise<DiscordStatus> {
    if (readyPromise) {
        return readyPromise;
    }

    readyPromise = new Promise<DiscordStatus>((resolve) => {
        client.once(Events.ClientReady, () => {
            console.log("Discord bot ready");
            resolve({ status: "ready" });
        });

        client.login(process.env.DISCORD_TOKEN).catch((err) => {
            console.error("Discord login failed", err);
            resolve({ status: "down" });
        });
    });

    return readyPromise;
}

export async function ensureReady(): Promise<DiscordStatus> {
    if (!readyPromise) {
        return startDiscordBot();
    }

    return readyPromise;
}