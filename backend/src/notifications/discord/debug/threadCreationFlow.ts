import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import {
    createThreadForAnnouncement,
    findThreadCreationCandidate,
    ThreadCreationOutcome,
    ThreadLookupError,
} from "../../../services/threadCreation";

export type Mode = "preview" | "trigger";

const LINK_INPUT_ID = "messageLink";
const MESSAGE_LINK_REGEX = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;

export async function showMessageLinkModal(interaction: StringSelectMenuInteraction, mode: Mode): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId(`debug:thread:modal:${mode}`)
        .setTitle(mode === "preview" ? "Preview Thread Creation" : "Trigger Thread Creation");

    const linkInput = new TextInputBuilder()
        .setCustomId(LINK_INPUT_ID)
        .setLabel("Announcement message link")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("https://discord.com/channels/<guild>/<channel>/<message>")
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(linkInput));

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction, mode: Mode): Promise<void> {
    const raw = interaction.fields.getTextInputValue(LINK_INPUT_ID).trim();
    const parsed = parseMessageLink(raw);

    if (!parsed) {
        const content = `"${raw}" doesn't look like a Discord message link. Right-click the announcement message → ` +
            "Copy Message Link, and paste that.";
        if (interaction.isFromMessage()) {
            await interaction.update({ content, components: [] });
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
        return;
    }

    const screen = await buildPreviewScreen(parsed, mode);

    if (interaction.isFromMessage()) {
        await interaction.update(screen);
    } else {
        await interaction.reply({ ...screen, ephemeral: true });
    }
}

export async function handleClose(interaction: ButtonInteraction): Promise<void> {
    await interaction.update({ content: "Closed.", components: [] });
}

export async function handleCancel(interaction: ButtonInteraction): Promise<void> {
    await interaction.update({ content: "Cancelled -- no thread was created.", components: [] });
}

export async function handleRun(interaction: ButtonInteraction, channelId: string, messageId: string): Promise<void> {
    await interaction.update({ content: "⏳ Creating thread...", components: [] });

    const start = Date.now();
    const outcome = await createThreadForAnnouncement(channelId, messageId);
    const elapsedMs = Date.now() - start;

    await interaction.editReply(describeOutcome(outcome, elapsedMs));
}

async function buildPreviewScreen(
    parsed: { guildId: string; channelId: string; messageId: string },
    mode: Mode,
) {
    const candidate = await findThreadCreationCandidate(parsed.channelId, parsed.messageId);
    const messageLink = `https://discord.com/channels/${parsed.guildId}/${parsed.channelId}/${parsed.messageId}`;

    if ("status" in candidate) {
        return { content: describeLookupError(candidate.status, messageLink), components: [] };
    }

    const header = mode === "preview" ? "🔍 **Preview: Thread Creation**" : "⚠️ **Trigger: Thread Creation**";
    const statusLine = candidate.alreadyHasThread
        ? `A thread already exists on this message: <#${candidate.existingThreadId}>. No action would be taken.`
        : `No thread exists yet. Would create a thread named **"${candidate.proposedThreadName}"**.`;

    const content = [
        header,
        `Target channel: <#${candidate.channelId}>`,
        `Target message: ${messageLink}`,
        `Proposed thread name: **${candidate.proposedThreadName}**`,
        `Thread already exists: **${candidate.alreadyHasThread ? "yes" : "no"}**`,
        "",
        statusLine,
    ].join("\n");

    // Nothing to run once a thread already exists -- a close-only screen instead of a
    // Run button that would just report "already exists" a second time.
    const components = mode === "preview" || candidate.alreadyHasThread
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("debug:thread:close").setLabel("Close").setStyle(ButtonStyle.Secondary),
        )]
        : [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`debug:thread:run:${candidate.channelId}:${candidate.messageId}`)
                .setLabel("Run")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("debug:thread:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
        )];

    return { content, components };
}

function describeLookupError(status: ThreadLookupError["status"], messageLink: string): string {
    switch (status) {
        case "not-an-announcement":
            return `That message isn't a theater opening-soon announcement I sent: ${messageLink}`;
        case "channel-unavailable":
            return `I can't access that channel: ${messageLink}`;
        case "message-unavailable":
            return `I can't find that message (maybe it was deleted): ${messageLink}`;
    }
}

function describeOutcome(outcome: ThreadCreationOutcome, elapsedMs: number): string {
    switch (outcome.status) {
        case "created":
            return `✅ **Done**\nCreated thread: <#${outcome.threadId}>\nElapsed: **${elapsedMs}ms**`;
        case "already-exists":
            return `ℹ️ A thread already existed: <#${outcome.threadId}>. No new thread was created.`;
        case "not-an-announcement":
            return "That message is no longer one of my announcements.";
        case "channel-unavailable":
            return "I can't access that channel anymore.";
        case "message-unavailable":
            return "I can't find that message anymore (maybe it was deleted).";
    }
}

function parseMessageLink(raw: string): { guildId: string; channelId: string; messageId: string } | null {
    const match = raw.match(MESSAGE_LINK_REGEX);
    if (!match) return null;

    const [, guildId, channelId, messageId] = match;
    return { guildId, channelId, messageId };
}
