import express from "express";
import {Listing} from "./models";
import {getNTPAPerformances} from "../fetchNTPA";
import {getBreakLegPerformances} from "../fetchBreaklegs";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {
  // const before = process.memoryUsage().heapUsed;
  // res.on("finish", () => {
  //   global.gc?.();
  //
  //   const after = process.memoryUsage().heapUsed;
  //
  //   console.log(
  //       `${req.path}: ${Math.round(before / 1024 / 1024)}MB -> ${Math.round(after / 1024 / 1024)}MB`
  //   );
  // });

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
