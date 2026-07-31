import express from "express";
import { asc } from "drizzle-orm";
import { getDB } from "../../db/client";
import { venues } from "../../db/schema";
import { Venue } from "../../../../models";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {
  res.send({ venues: await fetchVenues() })
})

export async function fetchVenues(): Promise<Venue[]> {
  const db = getDB();

  const rows = await db.select().from(venues).orderBy(asc(venues.name));

  return rows.map((row) => ({
    id: row.sourceId,
    theaterName: row.name,
    // The frontend calls .toLowerCase() on these unconditionally, so a missing address
    // has to be an empty string rather than null. NTPA venues have no address yet, which
    // means they still match no city -- exactly as before they existed as rows at all.
    address: row.address ?? "",
    website: row.website ?? "",
  }));
}

export default router
