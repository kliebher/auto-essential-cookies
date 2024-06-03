const fs = require('fs')
const path = require('path')

const OUTPUT_FILE_NAME = 'test_results.json'

const currentDate = () => {
    const date = new Date()
    return [date.getDate(), date.getMonth() + 1, date.getFullYear()].join('_')
}

class OutputHandler {
    constructor() {
        this.init()
    }

    init() {
        this.handleMissingDir(this.outputPath)
        this.handleMissingDir(this.dailyDirectory)
        this.handleMissingFile(this.fullPath)
    }

    handleMissingDir(path) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path)
        }
    }

    handleMissingFile(path) {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify({}, null, 2))
        }
    }

    get outputPath() {
        return path.join(__dirname, '../output')
    }

    get dailyDirectory() {
        return path.join(this.outputPath, currentDate())
    }

    get fullPath() {
        return path.join(this.dailyDirectory, OUTPUT_FILE_NAME)
    }

    get outputFile() {
        return JSON.parse(fs.readFileSync(this.fullPath, 'utf-8'))
    }

    set outputFile(updated) {
        fs.writeFileSync(this.fullPath, JSON.stringify(updated, null, 2))
    }

    updateOutputFile(key, update) {
        const file = this.outputFile
        file[key] = update
        this.outputFile = file
    }

    getResult(key) {
        return this.outputFile[key]
    }
}

module.exports = new OutputHandler()