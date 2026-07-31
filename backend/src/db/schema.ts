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
