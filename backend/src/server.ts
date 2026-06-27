import express from 'express';
import cors from 'cors';
import performanceRoute from './routes/performances'

const app = express()
const port = 3000

app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/performances', performanceRoute);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})