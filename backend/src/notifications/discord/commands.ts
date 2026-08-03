import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";
import {
    listWatchedVenues,
    searchUnwatchedVenues,
    searchWatchedVenues,
    unwatchVenue,
    watchVenue,
} from "../../db/watchedTheaters";
import { subscribeChannel, unsubscribeChannel } from "../../db/subscribedChannels";
import { generateOpeningSoonAnnouncements } from "../../services/openingSoonAnnouncements";

const THEATER_OPTION = "theater";
const AUTOCOMPLETE_RESULT_LIMIT = 25;

export const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Test the bot"),

    new SlashCommandBuilder()
        .setName("watch-theater")
        .setDescription("Get opening-soon announcements for a theater")
        .addStringOption((option) =>
            option
                .setName(THEATER_OPTION)
                .setDescription("Theater name")
                .setRequired(true)
                .setAutocomplete(true)),

    new SlashCommandBuilder()
        .setName("unwatch-theater")
        .setDescription("Stop watching a theater")
        .addStringOption((option) =>
            option
                .setName(THEATER_OPTION)
                .setDescription("Theater name")
                .setRequired(true)
                .setAutocomplete(true)),

    new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribe this channel to theater announcements"),

    new SlashCommandBuilder()
        .setName("unsubscribe")
        .setDescription("Unsubscribe this channel from theater announcements"),

    new SlashCommandBuilder()
        .setName("watched-theaters")
        .setDescription("List theaters currently being watched for opening-soon announcements"),

    new SlashCommandBuilder()
        .setName("trigger-coming-soon")
        .setDescription("Debug: resend opening-soon announcements, ignoring dedupe"),
].map((command) => command.toJSON());

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction,
) {
    switch (interaction.commandName) {
        case "ping":
            await interaction.reply("🏓 Pong!");
            break;

        case "watch-theater":
            await handleWatchTheater(interaction);
            break;

        case "unwatch-theater":
            await handleUnwatchTheater(interaction);
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

        case "trigger-coming-soon":
            await handleTriggerComingSoon(interaction);
            break;

        default:
            await interaction.reply({
                content: "Unknown command.",
                ephemeral: true,
            });
    }
}

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name !== THEATER_OPTION || !interaction.channelId) {
        await interaction.respond([]);
        return;
    }

    const matches = interaction.commandName === "unwatch-theater"
        ? await searchWatchedVenues(interaction.channelId, focused.value, AUTOCOMPLETE_RESULT_LIMIT)
        : await searchUnwatchedVenues(interaction.channelId, focused.value, AUTOCOMPLETE_RESULT_LIMIT);

    await interaction.respond(
        matches.map((venue) => ({ name: venue.name.slice(0, 100), value: String(venue.venueId) })),
    );
}

function getSelectedVenueId(interaction: ChatInputCommandInteraction): number | null {
    const raw = interaction.options.getString(THEATER_OPTION, true);
    const venueId = Number(raw);

    return Number.isInteger(venueId) ? venueId : null;
}

async function handleWatchTheater(interaction: ChatInputCommandInteraction) {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const venueId = getSelectedVenueId(interaction);
    if (venueId === null) {
        await interaction.reply({ content: "Please pick a theater from the suggestions list.", ephemeral: true });
        return;
    }

    const result = await watchVenue(interaction.channelId, venueId);

    await interaction.reply({
        content: result === "watched"
            ? "🎭 Watching that theater in this channel — you'll get opening-soon announcements for it here."
            : "Already watching that theater in this channel.",
        ephemeral: true,
    });
}

async function handleUnwatchTheater(interaction: ChatInputCommandInteraction) {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const venueId = getSelectedVenueId(interaction);
    if (venueId === null) {
        await interaction.reply({ content: "Please pick a theater from the suggestions list.", ephemeral: true });
        return;
    }

    const result = await unwatchVenue(interaction.channelId, venueId);

    await interaction.reply({
        content: result === "unwatched"
            ? "Stopped watching that theater in this channel."
            : "That theater wasn't being watched in this channel.",
        ephemeral: true,
    });
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

async function handleTriggerComingSoon(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.DISCORD_ADMIN_USER_ID) {
        await interaction.reply({ content: "You are not authorized to use this command.", ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const { announcementsSent } = await generateOpeningSoonAnnouncements({ ignoreAlreadyAnnounced: true });

    await interaction.editReply(`Generated ${announcementsSent} opening-soon announcement(s).`);
}
