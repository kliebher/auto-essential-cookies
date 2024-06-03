const express = require('express')
const cors = require('cors')
const outputHandler = require('./utility/output_handler.cjs')

class TestResultHandleServer {
    constructor(store) {
        this.app = express()
        this.pendingResults = []
        this.store = store
        this.port = process.env.PORT || 3000
        this.outputHandler = outputHandler
        this.server = null
        this.#init()
        this.#listen()
    }

    #init() {
        this.#initMiddleware()
        this.#initResultEndpoint()
    }

    #initMiddleware() {
        this.app.use(express.json())
        this.app.use(cors())
    }

    #initResultEndpoint() {
        this.app.post('/', (req, res) => {
            this.pendingResults.push(req.body)
            res.status(200).send();
        });
    }

    #updateOutputFile(update) {
        this.outputHandler.updateOutputFile(this.store.currentKey, update)
        this.store.status = 'done'
    }

    handlePendingResults() {
        if (this.pendingResults.length === 0) return
        const update = this.pendingResults.shift()
        this.#updateOutputFile(update)
    }

    #listen() {
        this.server = this.app.listen(this.port, () => {
            setInterval(this.handlePendingResults.bind(this), 1000)
        });
    }

    stop() {
        this.server.close()
    }
}


module.exports = TestResultHandleServer