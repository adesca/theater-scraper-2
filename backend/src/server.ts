import express from 'express';
import cors from 'cors';
import performanceRoute from './routes/performances'

const app = express()
const port = process.env.ENV !== 'dev' ? 4000 : 3000;


const corsOpts = process.env.ENV !== 'dev' ? {origin: 'https://theater.adesca.dev'} : undefined
app.use(cors(corsOpts))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/performances', performanceRoute);

app.listen(port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${port}`)
})
