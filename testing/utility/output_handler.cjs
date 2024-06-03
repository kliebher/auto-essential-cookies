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

    handleMissingKey(file, key, _default = {}) {
        if (!file[key]) {
            file[key] = _default
        }
    }

    handleArrayValue(entry, property, value) {
        if (entry[property] && Array.isArray(entry[property])) {
            entry[property].push(...value)
        } else {
            this.handleValue(entry, property, value)
        }
    }

    handleValue(entry, property, value) {
        entry[property] = value
    }

    updateOutputFile(key, property, value) {
        const file = this.outputFile
        this.handleMissingKey(file, key)
        Array.isArray(value)
            ? this.handleArrayValue(file[key], property, value)
            : this.handleValue(file[key], property, value)
        this.outputFile = file
    }

    entryExists(key) {
        return !!this.outputFile[key]
    }
}

module.exports = new OutputHandler()