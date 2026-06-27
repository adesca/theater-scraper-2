import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const performanceTable = sqliteTable("performances", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    startDate: text().notNull(),
    endDate: text().notNull(),
    company: text().notNull(),
});
