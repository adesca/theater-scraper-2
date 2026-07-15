import express from "express";
import { getBreakLegTheaters} from "../fetchBreaklegs";
import {Venue} from "../../../../models";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {

  const venues = await fetchVenues();
  res.send({ venues })
})

async function fetchVenues(): Promise<Venue[]> {
  const allVenues =  {
    breakLegs: await getBreakLegTheaters(),
  }

  return Object.values(allVenues).flat();
}

export default router
