import {getBreakLegPerformances} from "./fetchPerformances";
import express from "express";

const router = express.Router();
router.use(express.json())

router.get('', async (req, res) => {
  const listings = await getBreakLegPerformances();
  // const theaters = await getBreakLegTheaters()
  res.send({ listings})
})


export default router
