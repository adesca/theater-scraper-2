import express from "express";
import {getDB} from "../../db/client";
import {analyticsEvents} from "../../db/schema";

const router = express.Router();
router.use(express.json())

const db = getDB();
router.post('', async (req, res) => {
  const insertedEvent = await db.insert(analyticsEvents).values({
    ...req.body,
    properties: JSON.stringify(req.body.properties)
  }).returning()

  res.status(204).send()
})

export default router
