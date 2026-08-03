import {
    Client,
    Events,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
    Interaction,
} from "discord.js";
import {handleSlashCommand} from "./commands";

export function registerEvents(client: Client) {
    client.once(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user?.tag}`);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        await onInteraction(interaction);
    });

    client.on(
        Events.MessageReactionAdd,
        async (
            reaction: MessageReaction | PartialMessageReaction,
            user: User | PartialUser,
        ) => {
            await onReactionAdded(reaction, user);
        },
    );
}

async function onInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    await handleSlashCommand(interaction);
}

async function onReactionAdded(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
) {
    if (user.bot) {
        return;
    }

    // Fetch partials if necessary.
    if (reaction.partial) {
        await reaction.fetch();
    }

    // TODO:
    // Handle 🧵 reactions.
}