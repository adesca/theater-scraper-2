import { client, startDiscordBot } from "./client";
import { registerEvents } from "./events";

export async function startNotifications() {
    if ((await startDiscordBot()).status === "down") {
        console.warn("Discord notifications are disabled.");
        return;
    }

    registerEvents(client);
}