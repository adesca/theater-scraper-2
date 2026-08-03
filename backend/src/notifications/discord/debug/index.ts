import {
    ActionRowBuilder,
    ButtonInteraction,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import * as comingSoonFlow from "./comingSoonFlow";
import * as threadCreationFlow from "./threadCreationFlow";

const MENU_CUSTOM_ID = "debug:menu";

export const debugCommandDefinition = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("Admin: opening-soon preview/trigger and thread-creation preview/trigger");

export function isDebugCustomId(customId: string): boolean {
    return customId.startsWith("debug:");
}

export async function handleDebugCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.user.id !== process.env.DISCORD_ADMIN_USER_ID) {
        await interaction.reply({ content: "You are not authorized to use this command.", ephemeral: true });
        return;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(MENU_CUSTOM_ID)
        .setPlaceholder("Choose a debug action")
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Preview Coming Soon").setValue("comingsoon:preview"),
            new StringSelectMenuOptionBuilder().setLabel("Trigger Coming Soon").setValue("comingsoon:trigger"),
            new StringSelectMenuOptionBuilder().setLabel("Preview Thread Creation").setValue("thread:preview"),
            new StringSelectMenuOptionBuilder().setLabel("Trigger Thread Creation").setValue("thread:trigger"),
        );

    await interaction.reply({
        content: "🛠️ Pick a debug action.",
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
        ephemeral: true,
    });
}

/** Routes any button/select-menu interaction whose customId starts with "debug:". */
export async function routeComponent(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    if (interaction.customId === MENU_CUSTOM_ID) {
        if (interaction.isStringSelectMenu()) await routeMenuSelection(interaction);
        return;
    }

    // debug:<flow>:<action>[:...args]
    const [, flow, action, ...args] = interaction.customId.split(":");

    if (flow === "comingsoon" && interaction.isButton()) {
        if (action === "close") return comingSoonFlow.handleClose(interaction);
        if (action === "cancel") return comingSoonFlow.handleCancel(interaction);
        if (action === "run") return comingSoonFlow.handleRun(interaction, args[0]);
    }

    if (flow === "thread" && interaction.isButton()) {
        if (action === "close") return threadCreationFlow.handleClose(interaction);
        if (action === "cancel") return threadCreationFlow.handleCancel(interaction);
        if (action === "run") return threadCreationFlow.handleRun(interaction, args[0], args[1]);
    }
}

/** Routes any modal submission whose customId starts with "debug:". */
export async function routeModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    // debug:<flow>:modal:<mode>
    const [, flow, , mode] = interaction.customId.split(":");

    if (mode !== "preview" && mode !== "trigger") return;

    if (flow === "comingsoon") {
        await comingSoonFlow.handleModalSubmit(interaction, mode);
        return;
    }

    if (flow === "thread") {
        await threadCreationFlow.handleModalSubmit(interaction, mode);
        return;
    }
}

async function routeMenuSelection(interaction: StringSelectMenuInteraction): Promise<void> {
    const [flow, mode] = interaction.values[0].split(":");

    if (mode !== "preview" && mode !== "trigger") return;

    if (flow === "comingsoon") {
        await comingSoonFlow.showBaseDateModal(interaction, mode);
        return;
    }

    if (flow === "thread") {
        await threadCreationFlow.showMessageLinkModal(interaction, mode);
        return;
    }
}
