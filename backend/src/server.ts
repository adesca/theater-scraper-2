import express from 'express';
import cors from 'cors';
import performanceRoute from './routes/performances'
import venueRoute from './routes/theaters'
import analyticsRoute from './routes/analytics'
import {getDB} from "./db/client";
import {analyticsEvents} from "./db/schema";

const app = express()
const port = process.env.ENV !== 'dev' ? 4000 : 3000;


const corsOpts = process.env.ENV !== 'dev' ? {origin: 'https://theater.adesca.dev'} : undefined
app.use(cors(corsOpts))
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/performances', performanceRoute);
app.use('/venues', venueRoute);
app.use('/analytics', analyticsRoute)

const db = getDB();

app.listen(port, '127.0.0.1', () => {
    db.insert(analyticsEvents).values({
        action: 'server-started',
        trackingId: 'server',
        screenWidth: 0,
        version: '0'
    }).then(() => {
        console.log(`Server listening on port ${port}`)
    })
})
