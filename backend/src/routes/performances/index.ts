import express from "express";
import { asc, eq } from "drizzle-orm";
import { getDB } from "../../db/client";
import { listings, shows } from "../../db/schema";
import { Listing } from "../../../../models";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {
  res.send({ listings: await fetchPerformances() })
})

export async function fetchPerformances(): Promise<Listing[]> {
  const db = getDB();

  const rows = await db
      .select({
        source: listings.source,
        sourceId: listings.sourceId,
        title: shows.title,
        company: listings.company,
        startDate: listings.startDate,
        endDate: listings.endDate,
        tags: listings.tags,
        imageUrl: listings.imageUrl,
        listingUrl: listings.listingUrl,
        lastSeenAt: listings.lastSeenAt,
      })
      .from(listings)
      .innerJoin(shows, eq(listings.showId, shows.id))
      .orderBy(asc(listings.startDate));

  return rows.map((row) => ({
    source: row.source as Listing['source'],
    name: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    company: row.company,
    id: row.sourceId,
    tags: JSON.parse(row.tags) as string[],
    imageUrl: row.imageUrl,
    listingUrl: row.listingUrl,
    timeOfFetch: row.lastSeenAt,
  }));
}

export default router
