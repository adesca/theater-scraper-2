import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";

export const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Test the bot"),

    new SlashCommandBuilder()
        .setName("watch-theater")
        .setDescription("Watch a theater"),

    new SlashCommandBuilder()
        .setName("unwatch-theater")
        .setDescription("Stop watching a theater"),

    new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribe this channel"),

    new SlashCommandBuilder()
        .setName("unsubscribe")
        .setDescription("Unsubscribe this channel"),
].map(command => command.toJSON());

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction,
) {
    switch (interaction.commandName) {
        case "ping":
            await interaction.reply("🏓 Pong!");
            break;

        case "watch-theater":
            // TODO
            break;

        case "unwatch-theater":
            // TODO
            break;

        case "subscribe":
            // TODO
            break;

        case "unsubscribe":
            // TODO
            break;

        default:
            await interaction.reply({
                content: "Unknown command.",
                ephemeral: true,
            });
    }
}