import nodeCron from "node-cron";
import { ingestAll } from "../ingest";

// `--once` is the manual scrape: `npm run scrape`, or `node dist/scrape.js --once` in prod.
const runOnce = process.argv.includes("--once");

async function main() {
    // Always ingest at startup, so a fresh deploy or an empty database has data
    // immediately instead of serving nothing until the first scheduled run.
    console.log("Running ingest");
    await ingestAll();
    console.log("Finished ingest");

    if (runOnce) return;

    nodeCron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled ingest')
        await ingestAll();
        console.log("Finished scheduled ingest")
    })

    console.log("Scheduled nightly ingest at 00:00")
}

void main();
