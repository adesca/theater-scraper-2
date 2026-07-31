import { resolve } from "node:path";

// Resolved against this file rather than the working directory: the server runs from
// the repo root under pm2 but from ./backend during development, and a relative path
// would mean two different databases (as it already did for the HTTP cache).
export const DB_FILE_NAME =
    process.env.THEATER_SCRAPER_DB_FILE ?? resolve(__dirname, "..", "data.db");
