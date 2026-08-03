import {
    ActionRow,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Message,
    MessageActionRowComponent,
    StringSelectMenuBuilder,
    StringSelectMenuComponent,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import { listAllVenues, listWatchedVenues, unwatchVenue, watchVenue, WatchedVenue } from "../../db/watchedTheaters";

const SELECT_CUSTOM_ID = "watcheditor:select";
const SAVE_CUSTOM_ID = "watcheditor:save";
const CANCEL_CUSTOM_ID = "watcheditor:cancel";

// Discord caps select menus at 25 options. This aggregator covers a small number of
// local theaters, so it isn't hit in practice; if it ever is, only the first 25
// (alphabetically) are selectable here rather than silently breaking the command.
const MAX_OPTIONS = 25;

export async function handleWatchTheaterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.channelId) {
        await interaction.reply({ content: "This command must be used in a channel.", ephemeral: true });
        return;
    }

    const venues = (await listAllVenues()).slice(0, MAX_OPTIONS);
    if (venues.length === 0) {
        await interaction.reply({
            content: "No theaters are known yet -- check back after the next scrape.",
            ephemeral: true,
        });
        return;
    }

    const watchedIds = new Set((await listWatchedVenues(interaction.channelId)).map((v) => v.venueId));

    await interaction.reply({ ...buildEditorMessage(venues, watchedIds), ephemeral: true });
}

export async function handleSelectChanged(interaction: StringSelectMenuInteraction): Promise<void> {
    const venues = (await listAllVenues()).slice(0, MAX_OPTIONS);
    const selectedIds = new Set(interaction.values.map(Number));

    // Re-render with the new choices as defaults: the message itself carries the pending
    // selection until Save or Cancel is pressed, so there's no separate state to track.
    await interaction.update(buildEditorMessage(venues, selectedIds));
}

export async function handleCancel(interaction: ButtonInteraction): Promise<void> {
    await interaction.update({ content: "Cancelled -- no changes made.", components: [] });
}

export async function handleSave(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.channelId) return;

    const selectedIds = extractSelectedVenueIds(interaction.message);
    const currentlyWatched = await listWatchedVenues(interaction.channelId);
    const currentlyWatchedIds = new Set(currentlyWatched.map((v) => v.venueId));

    const toWatch = [...selectedIds].filter((id) => !currentlyWatchedIds.has(id));
    const toUnwatch = [...currentlyWatchedIds].filter((id) => !selectedIds.has(id));

    for (const venueId of toWatch) await watchVenue(interaction.channelId, venueId);
    for (const venueId of toUnwatch) await unwatchVenue(interaction.channelId, venueId);

    const namesById = new Map((await listAllVenues()).map((v) => [v.venueId, v.name]));
    await interaction.update({ content: buildSaveSummary(toWatch, toUnwatch, namesById), components: [] });
}

function buildEditorMessage(venues: WatchedVenue[], selectedIds: Set<number>) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(SELECT_CUSTOM_ID)
        .setPlaceholder("Select theaters to watch in this channel")
        .setMinValues(0)
        .setMaxValues(venues.length)
        .addOptions(venues.map((venue) =>
            new StringSelectMenuOptionBuilder()
                .setLabel(venue.name.slice(0, 100))
                .setValue(String(venue.venueId))
                .setDefault(selectedIds.has(venue.venueId))));

    const save = new ButtonBuilder().setCustomId(SAVE_CUSTOM_ID).setLabel("Save").setStyle(ButtonStyle.Success);
    const cancel = new ButtonBuilder().setCustomId(CANCEL_CUSTOM_ID).setLabel("Cancel").setStyle(ButtonStyle.Secondary);

    return {
        content: "🎭 Choose which theaters this channel should watch for opening-soon announcements, then press Save.",
        components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(save, cancel),
        ],
    };
}

/** Reads the select menu's current (possibly not-yet-saved) selection directly off the message. */
function extractSelectedVenueIds(message: Message): Set<number> {
    for (const row of message.components) {
        if (!(row instanceof ActionRow)) continue;

        for (const component of row.components as MessageActionRowComponent[]) {
            if (component instanceof StringSelectMenuComponent) {
                return new Set(component.options.filter((o) => o.default).map((o) => Number(o.value)));
            }
        }
    }

    return new Set();
}

function buildSaveSummary(toWatch: number[], toUnwatch: number[], namesById: Map<number, string>): string {
    if (toWatch.length === 0 && toUnwatch.length === 0) {
        return "Saved -- no changes.";
    }

    const lines: string[] = [];
    if (toWatch.length > 0) {
        lines.push(`🎭 Now watching: ${toWatch.map((id) => namesById.get(id) ?? `#${id}`).join(", ")}`);
    }
    if (toUnwatch.length > 0) {
        lines.push(`Stopped watching: ${toUnwatch.map((id) => namesById.get(id) ?? `#${id}`).join(", ")}`);
    }

    return lines.join("\n");
}
