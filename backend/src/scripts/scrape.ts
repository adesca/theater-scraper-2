import nodeCron from "node-cron";
import { ingestAll } from "../ingest";
import { startNotifications } from "../notifications/discord";
import { generateOpeningSoonAnnouncements } from "../services/openingSoonAnnouncements";

// `--once` is the manual scrape: `npm run scrape`, or `node dist/scrape.js --once` in prod
// (also run at every deploy, see package.json's `build` script). It never touches Discord,
// so it can run to completion and exit without needing DISCORD_TOKEN set, and without
// leaving a gateway connection open that would keep the process alive.
const runOnce = process.argv.includes("--once");

async function ingestAndAnnounce() {
    await ingestAll();
    const { announcementsSent } = await generateOpeningSoonAnnouncements();
    console.log(`Sent ${announcementsSent} opening-soon announcement(s)`);
}

async function main() {
    // Always ingest at startup, so a fresh deploy or an empty database has data
    // immediately instead of serving nothing until the first scheduled run.
    console.log("Running ingest");
    await ingestAll();
    console.log("Finished ingest");

    if (runOnce) return;

    // This is the one long-running backend process, so it also owns the Discord bot:
    // logging in here keeps a single gateway connection for slash commands and reactions,
    // and lets announcement generation actually send (it needs the bot logged in first).
    await startNotifications();

    const { announcementsSent } = await generateOpeningSoonAnnouncements();
    console.log(`Sent ${announcementsSent} opening-soon announcement(s)`);

    nodeCron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled ingest')
        await ingestAndAnnounce();
        console.log("Finished scheduled ingest")
    })

    console.log("Scheduled nightly ingest at 00:00")
}

void main();
