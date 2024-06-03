const express = require('express')
const cors = require('cors')
const outputHandler = require('./utility/output_handler.cjs')

const app = express();

app.use(express.json());
app.use(cors())

const pendingResults = []
let updateHandler = null



// Endpoint to receive test results
app.post('/', (req, res) => {
    pendingResults.push(req.body)
    res.status(200).send();
});

const parseUrlToKey = (url) => {
    let key = url.split('.')
    return key[key.length > 2 ? 1 : 0]
}

function updateOutputFile(update) {
    let { actual, time, host } = update
    const key = parseUrlToKey(host)
    outputHandler.updateOutputFile(key, 'actual', actual)
    outputHandler.updateOutputFile(key, 'time', time)
}

function handlePendingResults() {
    if (pendingResults.length === 0) return
    const update = pendingResults.shift()
    console.log('[UPDATE] ', update.host)
    updateOutputFile(update)
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WAITING FOR INCOMING TEST RESULTS ON PORT [${PORT}]`)
    updateHandler = setInterval(handlePendingResults, 1000)
});

