// better-sqlite3 rather than the built-in node:sqlite: Drizzle's node-sqlite driver calls
// StatementSync#setReturnArrays, which only exists from Node 24 onwards, and both CI and
// the server run Node 22.
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_FILE_NAME } from "../constants";

// The schema is created in code rather than with drizzle-kit migrations: everything in
// these tables is re-derivable by re-running the scrape, so there is nothing to migrate
// yet, and a generated migrations folder would have to be located at runtime by a
// relative path. Once there is user data (favorites, watchlists, user tags) this should
// become real generated migrations.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS shows (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    normalizedKey TEXT NOT NULL,
    firstSeenAt   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS shows_normalized_key_idx ON shows (normalizedKey);

CREATE TABLE IF NOT EXISTS venues (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    source         TEXT NOT NULL,
    sourceId       TEXT NOT NULL,
    name           TEXT NOT NULL,
    normalizedName TEXT NOT NULL,
    address        TEXT,
    website        TEXT,
    firstSeenAt    TEXT NOT NULL,
    lastSeenAt     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS venues_source_id_idx ON venues (source, sourceId);
CREATE INDEX IF NOT EXISTS venues_normalized_name_idx ON venues (source, normalizedName);

CREATE TABLE IF NOT EXISTS listings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    source       TEXT NOT NULL,
    sourceId     TEXT NOT NULL,
    showId       INTEGER NOT NULL REFERENCES shows (id),
    venueId      INTEGER REFERENCES venues (id),
    company      TEXT NOT NULL,
    startDate    TEXT NOT NULL,
    endDate      TEXT NOT NULL,
    imageUrl     TEXT,
    listingUrl   TEXT NOT NULL,
    tags         TEXT NOT NULL DEFAULT '[]',
    firstSeenAt  TEXT NOT NULL,
    lastSeenAt   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS listings_source_id_idx ON listings (source, sourceId);
CREATE INDEX IF NOT EXISTS listings_start_date_idx ON listings (startDate);
CREATE INDEX IF NOT EXISTS listings_end_date_idx ON listings (endDate);
CREATE INDEX IF NOT EXISTS listings_show_idx ON listings (showId);
CREATE INDEX IF NOT EXISTS listings_venue_idx ON listings (venueId);
`;

let db: ReturnType<typeof drizzle> | undefined;

export function getDB() {
    if (db) return db;

    db = drizzle(DB_FILE_NAME);

    // WAL matters here: the API server and the scrape job are separate pm2 processes
    // opening the same file, and WAL lets reads continue during the nightly write.
    db.$client.exec("PRAGMA journal_mode = WAL");
    db.$client.exec("PRAGMA busy_timeout = 5000");
    db.$client.exec("PRAGMA foreign_keys = ON");
    db.$client.exec(SCHEMA_SQL);

    return db;
}
