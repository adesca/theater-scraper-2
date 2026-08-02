import express from "express";
import { asc } from "drizzle-orm";
import { getDB } from "../../db/client";
import {analyticsEvents, venues} from "../../db/schema";
import { Venue } from "../../../../models";

const router = express.Router();
router.use(express.json())

const db = getDB();
router.post('', async (req, res) => {
  const insertedEvent = await db.insert(analyticsEvents).values({
    ...req.body,
    properties: JSON.stringify(req.body.properties)
  }).returning()
  console.log('analytics event inserted', insertedEvent)

  res.status(204).send()
})

export default router
