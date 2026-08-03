import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { listWatchedVenues } from "../../db/watchedTheaters";
import { subscribeChannel, unsubscribeChannel } from "../../db/subscribedChannels";
import { debugCommandDefinition, handleDebugCommand } from "./debug";
import { handleWatchTheaterCommand } from "./watchEditor";

export const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Test the bot"),

    new SlashCommandBuilder()
        .setName("watch-theater")
        .setDescription("Choose which theaters this channel watches for opening-soon announcements"),

    new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribe this channel to theater announcements"),

    new SlashCommandBuilder()
        .setName("unsubscribe")
        .setDescription("Unsubscribe this channel from theater announcements"),

    new SlashCommandBuilder()
        .setName("watched-theaters")
        .setDescription("List theaters currently being watched for opening-soon announcements"),

    debugCommandDefinition,
].map((command) => command.toJSON());

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction,
) {
    switch (interaction.commandName) {
        case "ping":
            await interaction.reply("🏓 Pong!");
            break;

        case "watch-theater":
            await handleWatchTheaterCommand(interaction);
            break;

        case "subscribe":
            await handleSubscribe(interaction);
            break;

        case "unsubscribe":
            await handleUnsubscribe(interaction);
            break;

        case "watched-theaters":
            await handleWatchedTheaters(interaction);
            break;

        case "debug":
            await handleDebugCommand(interaction);
            break;

        default:
            await interaction.reply({
                content: "Unknown command.",
                ephemeral: true,
            });
    }
}

async function handleSubscribe(interaction: ChatInputCommandInteraction) {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const result = await subscribeChannel(interaction.channelId);

    await interaction.reply({
        content: result === "subscribed"
            ? "🔔 This channel will now receive theater announcements."
            : "This channel is already subscribed.",
        ephemeral: true,
    });
}

async function handleUnsubscribe(interaction: ChatInputCommandInteraction) {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const result = await unsubscribeChannel(interaction.channelId);

    await interaction.reply({
        content: result === "unsubscribed"
            ? "This channel will no longer receive theater announcements."
            : "This channel wasn't subscribed.",
        ephemeral: true,
    });
}

async function handleWatchedTheaters(interaction: ChatInputCommandInteraction) {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const venues = await listWatchedVenues(interaction.channelId);

    if (venues.length === 0) {
        await interaction.reply({ content: "No theaters are being watched in this channel yet.", ephemeral: true });
        return;
    }

    const list = venues.map((venue) => `• ${venue.name}`).join("\n");
    await interaction.reply({ content: `🎭 Watched theaters in this channel:\n${list}`, ephemeral: true });
}
