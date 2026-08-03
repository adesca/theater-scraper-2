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
import {routeComponentInteraction, routeModalSubmitInteraction} from "./componentRouter";
import {handleThreadReaction} from "./reactions";

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
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await routeComponentInteraction(interaction);
        return;
    }

    if (interaction.isModalSubmit()) {
        await routeModalSubmitInteraction(interaction);
    }
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

    await handleThreadReaction(reaction, user);

    // TODO: Handle 🔔 (follow this production) and 🏛️ (follow this theater) reactions
    // once those features exist.
}