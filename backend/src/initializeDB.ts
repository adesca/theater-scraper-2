import { drizzle } from 'drizzle-orm/node-sqlite';
import {DB_FILE_NAME} from "../constants";

let db: ReturnType<typeof drizzle>;
export async function getDB() {
    if (db) return db;

    db = drizzle(DB_FILE_NAME);

    return db;
}
