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
import { format } from "date-fns";
import {
    findPendingOpeningSoonAnnouncements,
    generateOpeningSoonAnnouncements,
    OpeningSoonCandidate,
} from "../../../services/openingSoonAnnouncements";

export type Mode = "preview" | "trigger";

const DATE_INPUT_ID = "baseDate";
const MAX_PREVIEW_LINES = 15;

export async function showBaseDateModal(interaction: StringSelectMenuInteraction, mode: Mode): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId(`debug:comingsoon:modal:${mode}`)
        .setTitle(mode === "preview" ? "Preview Coming Soon" : "Trigger Coming Soon");

    const dateInput = new TextInputBuilder()
        .setCustomId(DATE_INPUT_ID)
        .setLabel("Base date (YYYY-MM-DD) -- blank for today")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("today")
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(dateInput));

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction, mode: Mode): Promise<void> {
    const raw = interaction.fields.getTextInputValue(DATE_INPUT_ID);
    const referenceDate = parseBaseDate(raw);

    if (!referenceDate) {
        const content = `"${raw}" isn't a valid date -- use YYYY-MM-DD (e.g. 2026-08-12), or leave it blank for today.`;
        if (interaction.isFromMessage()) {
            await interaction.update({ content, components: [] });
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
        return;
    }

    const screen = await buildPreviewScreen(referenceDate, mode);

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
    await interaction.update({ content: "Cancelled -- nothing was sent.", components: [] });
}

export async function handleRun(interaction: ButtonInteraction, dateKey: string): Promise<void> {
    const referenceDate = parseBaseDate(dateKey);
    if (!referenceDate) {
        await interaction.update({ content: "Something went wrong reading the date -- run /debug again.", components: [] });
        return;
    }

    await interaction.update({ content: "⏳ Sending announcements...", components: [] });

    const start = Date.now();
    const pending = await findPendingOpeningSoonAnnouncements(referenceDate);
    const { announcementsSent } = await generateOpeningSoonAnnouncements({ referenceDate });
    const elapsedMs = Date.now() - start;

    await interaction.editReply([
        "✅ **Done**",
        `Notifications created: **${announcementsSent}**`,
        `Productions processed: **${pending.length}**`,
        `Elapsed: **${elapsedMs}ms**`,
    ].join("\n"));
}

async function buildPreviewScreen(referenceDate: Date, mode: Mode) {
    const pending = await findPendingOpeningSoonAnnouncements(referenceDate);
    const content = renderPreviewContent(referenceDate, pending, mode);

    const components = mode === "preview"
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("debug:comingsoon:close").setLabel("Close").setStyle(ButtonStyle.Secondary),
        )]
        : [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`debug:comingsoon:run:${dateKey(referenceDate)}`)
                .setLabel("Run")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("debug:comingsoon:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
        )];

    return { content, components };
}

function renderPreviewContent(referenceDate: Date, pending: OpeningSoonCandidate[], mode: Mode): string {
    const header = mode === "preview" ? "🔍 **Preview: Coming Soon**" : "⚠️ **Trigger: Coming Soon**";
    const dateLabel = format(referenceDate, "MMMM d, yyyy");

    if (pending.length === 0) {
        return `${header}\nAs of **${dateLabel}**: nothing would be sent.`;
    }

    const theaterCount = new Set(pending.map((c) => c.venueName)).size;
    const lines = pending
        .slice(0, MAX_PREVIEW_LINES)
        .map((c) => `• ${c.showTitle} — ${c.venueName} (opens ${format(new Date(c.startDate), "MMMM d")}) → <#${c.discordChannelId}>`);
    const overflow = pending.length > MAX_PREVIEW_LINES
        ? `\n_...and ${pending.length - MAX_PREVIEW_LINES} more_`
        : "";

    return [
        header,
        `As of **${dateLabel}**: **${pending.length}** production(s) at **${theaterCount}** theater(s) ` +
            `→ would send **${pending.length}** message(s).`,
        "",
        ...lines,
    ].join("\n") + overflow;
}

function parseBaseDate(raw: string): Date | null {
    const trimmed = raw.trim();
    if (trimmed === "") return new Date();

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));
    const roundTrips = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

    return roundTrips ? date : null;
}

function dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}
