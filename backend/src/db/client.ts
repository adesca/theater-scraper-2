// better-sqlite3 rather than the built-in node:sqlite: Drizzle's node-sqlite driver calls
// StatementSync#setReturnArrays, which only exists from Node 24 onwards, and both CI and
// the server run Node 22.
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_FILE_NAME } from "../constants";

// The schema is created in code rather than with drizzle-kit migrations: everything in
// these tables is re-derivable by re-running the scrape, so there is nothing to migrate
// yet, and a generated migrations folder would have to be located at runtime by a
// relative path.
//
// watched_theaters / subscribed_channels / announcements / announcement_thread_interest
// are the first real user data in this database (not re-derivable from a scrape), which
// is the condition under which this file said migrations should start. Deferred for now
// to keep the notifications MVP small -- every statement below is still
// IF NOT EXISTS/idempotent, so switching to generated migrations later is a mechanical
// change, not a rewrite.
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

CREATE TABLE IF NOT EXISTS watched_theaters (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    discordChannelId TEXT NOT NULL,
    venueId          INTEGER NOT NULL REFERENCES venues (id),
    createdAt        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS watched_theaters_channel_venue_idx ON watched_theaters (discordChannelId, venueId);

CREATE TABLE IF NOT EXISTS subscribed_channels (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    discordChannelId TEXT NOT NULL,
    createdAt        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribed_channels_channel_idx ON subscribed_channels (discordChannelId);

CREATE TABLE IF NOT EXISTS announcements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    performanceId    INTEGER NOT NULL REFERENCES listings (id),
    type             TEXT NOT NULL,
    announcedAt      TEXT NOT NULL,
    discordChannelId TEXT NOT NULL,
    discordMessageId TEXT NOT NULL,
    discordThreadId  TEXT,
    sourceUrl        TEXT NOT NULL,
    websiteUrl       TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS announcements_performance_type_channel_idx
    ON announcements (performanceId, type, discordChannelId);

CREATE TABLE IF NOT EXISTS announcement_thread_interest (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    announcementId INTEGER NOT NULL REFERENCES announcements (id),
    discordUserId  TEXT NOT NULL,
    reactedAt      TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS announcement_thread_interest_user_idx
    ON announcement_thread_interest (announcementId, discordUserId);

CREATE TABLE IF NOT EXISTS analytics_events (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                                action TEXT NOT NULL,

                                                tracking_id TEXT NOT NULL,

                                                screen_width INTEGER NOT NULL,
                                                version TEXT NOT NULL,

                                                properties TEXT
);
CREATE INDEX IF NOT EXISTS analytics_action_created_idx ON analytics_events(action, created_at);

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
