import { ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";
import * as debug from "./debug";
import * as watchEditor from "./watchEditor";

/** Dispatches by customId namespace ("watcheditor:..." / "debug:...") -- see each module for its own routing. */
export async function routeComponentInteraction(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
    if (interaction.customId.startsWith("watcheditor:")) {
        await routeWatchEditorComponent(interaction);
        return;
    }

    if (debug.isDebugCustomId(interaction.customId)) {
        await debug.routeComponent(interaction);
    }
}

export async function routeModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
    if (debug.isDebugCustomId(interaction.customId)) {
        await debug.routeModalSubmit(interaction);
    }
}

async function routeWatchEditorComponent(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
    if (interaction.customId === "watcheditor:select" && interaction.isStringSelectMenu()) {
        await watchEditor.handleSelectChanged(interaction);
        return;
    }

    if (interaction.customId === "watcheditor:save" && interaction.isButton()) {
        await watchEditor.handleSave(interaction);
        return;
    }

    if (interaction.customId === "watcheditor:cancel" && interaction.isButton()) {
        await watchEditor.handleCancel(interaction);
    }
}
