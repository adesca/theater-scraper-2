import { REST, Routes } from "discord.js";
import {commands} from "../notifications/discord/commands";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID;

const rest = new REST({ version: "10" }).setToken(token);

async function deployCommands() {
    console.log(`Registering ${commands.length} slash command(s)...`);

    if (guildId) {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`✅ Synced ${commands.length} command(s) to guild ${guildId}`);
    } else {
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`✅ Synced ${commands.length} command(s) globally`);
    }
}

deployCommands().catch((error) => {
    console.error("Failed to sync commands:", error);
    process.exit(1);
});