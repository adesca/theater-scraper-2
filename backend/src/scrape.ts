import nodeCron from "node-cron";
import {getBreakLegPerformances} from "./routes/fetchBreaklegs";


nodeCron.schedule('0 0 * * *', async () => {
    console.log('Fetching breakleg performances to refresh cache')
    await getBreakLegPerformances();
    console.log("Finished fetching breakleg performances")

})