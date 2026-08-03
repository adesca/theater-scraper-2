import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * A show is a work ("Frozen Jr.", "Hamlet"), identified by its normalized title.
 * Two versions of the same story that differ in title -- a "Jr." cut, a subtitled
 * edition -- are deliberately separate shows.
 */
export const shows = sqliteTable("shows", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    normalizedKey: text().notNull(),
    firstSeenAt: text().notNull(),
}, (table) => [
    uniqueIndex("shows_normalized_key_idx").on(table.normalizedKey),
]);

/**
 * A venue is a theater. `address` and `website` are nullable because NTPA publishes
 * addresses only on individual show pages, which we do not scrape; those rows are
 * expected to be completed by hand.
 */
export const venues = sqliteTable("venues", {
    id: integer().primaryKey({ autoIncrement: true }),
    source: text().notNull(),
    sourceId: text().notNull(),
    name: text().notNull(),
    normalizedName: text().notNull(),
    address: text(),
    website: text(),
    firstSeenAt: text().notNull(),
    lastSeenAt: text().notNull(),
}, (table) => [
    uniqueIndex("venues_source_id_idx").on(table.source, table.sourceId),
    index("venues_normalized_name_idx").on(table.source, table.normalizedName),
]);

/**
 * A listing is one run of one show at one venue, as reported by one source. The same
 * show playing at three venues at once is three listings pointing at one `shows` row.
 *
 * `company` keeps the raw string the source reported, so the API still has something
 * to display when `venueId` cannot be resolved. `tags` is a JSON array of the tags
 * the source itself applied; user-defined tags will need their own table.
 */
export const listings = sqliteTable("listings", {
    id: integer().primaryKey({ autoIncrement: true }),
    source: text().notNull(),
    sourceId: text().notNull(),
    showId: integer().notNull().references(() => shows.id),
    venueId: integer().references(() => venues.id),
    company: text().notNull(),
    startDate: text().notNull(),
    endDate: text().notNull(),
    imageUrl: text(),
    listingUrl: text().notNull(),
    tags: text().notNull().default("[]"),
    firstSeenAt: text().notNull(),
    lastSeenAt: text().notNull(),
}, (table) => [
    uniqueIndex("listings_source_id_idx").on(table.source, table.sourceId),
    index("listings_start_date_idx").on(table.startDate),
    index("listings_end_date_idx").on(table.endDate),
    index("listings_show_idx").on(table.showId),
    index("listings_venue_idx").on(table.venueId),
]);

/**
 * A theater a Discord channel wants "opening soon" announcements for. Kept as its own
 * table (rather than a column on `venues`) because it's user data, not scraped data --
 * `venues` rows are re-derived by re-scraping, watches are not.
 *
 * Scoped to `discordChannelId` (not global) so two servers watching different theaters
 * don't see each other's announcements: a channel only gets announcements for theaters
 * watched in that same channel.
 */
export const watchedTheaters = sqliteTable("watched_theaters", {
    id: integer().primaryKey({ autoIncrement: true }),
    discordChannelId: text().notNull(),
    venueId: integer().notNull().references(() => venues.id),
    createdAt: text().notNull(),
}, (table) => [
    uniqueIndex("watched_theaters_channel_venue_idx").on(table.discordChannelId, table.venueId),
]);

/** A Discord channel that should receive theater announcements. */
export const subscribedChannels = sqliteTable("subscribed_channels", {
    id: integer().primaryKey({ autoIncrement: true }),
    discordChannelId: text().notNull(),
    createdAt: text().notNull(),
}, (table) => [
    uniqueIndex("subscribed_channels_channel_idx").on(table.discordChannelId),
]);

/**
 * An append-only record of announcements actually sent -- one row per Discord message,
 * so one qualifying listing produces one row per subscribed channel. `type` exists so
 * future announcement kinds (closing soon, newly announced, ...) can share this table
 * instead of each needing their own.
 */
export const announcements = sqliteTable("announcements", {
    id: integer().primaryKey({ autoIncrement: true }),
    performanceId: integer().notNull().references(() => listings.id),
    type: text().notNull(),
    announcedAt: text().notNull(),
    discordChannelId: text().notNull(),
    discordMessageId: text().notNull(),
    // Set once the 🧵 reaction threshold creates a discussion thread for this message.
    discordThreadId: text(),
    sourceUrl: text().notNull(),
    websiteUrl: text().notNull(),
}, (table) => [
    uniqueIndex("announcements_performance_type_channel_idx")
        .on(table.performanceId, table.type, table.discordChannelId),
]);

/** One user's 🧵 "interested in a thread" reaction on an announcement message. */
export const announcementThreadInterest = sqliteTable("announcement_thread_interest", {
    id: integer().primaryKey({ autoIncrement: true }),
    announcementId: integer().notNull().references(() => announcements.id),
    discordUserId: text().notNull(),
    reactedAt: text().notNull(),
}, (table) => [
    uniqueIndex("announcement_thread_interest_user_idx").on(table.announcementId, table.discordUserId),
]);

export const analyticsEvents = sqliteTable("analytics_events", {
    id: integer().primaryKey({ autoIncrement: true }),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    action: text().notNull(),
    trackingId: text("tracking_id").notNull(),
    screenWidth: integer("screen_width").notNull(),
    version: text().notNull(),
    // JSON blob containing event specific properties
    properties: text()
}, (table) => [
    index("analytics_action_created_idx").on(table.action, table.createdAt)
]);