import { getBreakLegPerformances} from "./fetchPerformances";
import express from "express";
import {Listing} from "./models";
import {getNTPAPerformances} from "./fetchNTPA";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {
  const listings = await fetchPerformances();
  // const theaters = await getBreakLegTheaters()
  res.send({ listings})
})

async function fetchPerformances(): Promise<Listing[]> {
  const allPerformances =  {
    breakLegs: await getBreakLegPerformances(),
    ntpa: await getNTPAPerformances()
  }

  return Object.values(allPerformances).flat();
}

export default router
