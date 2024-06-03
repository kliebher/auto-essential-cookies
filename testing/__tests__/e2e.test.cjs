const puppeteer = require('puppeteer')
const path = require('path')
const EXPECTED_RESULTS = require('../__data__/data.cjs');
const outputHandler = require('../utility/output_handler.cjs')

const pathToExtension = path.join(__dirname, '../..');

const CONFIG = {
    args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`
    ],
    headless: true
}

const parseUrlToKey = (url) => {
    let key = url.split('.')
    return key[key.length > 2 ? 1 : 0]
}


for (const { url, expected } of EXPECTED_RESULTS){
    describe(url, () => {
        it('open the page & wait for result', async () => {
            const browser = await puppeteer.launch(CONFIG);
            const page = await browser.newPage()
            await page.goto(url);
            while (1) {
                if (outputHandler.entryExists(parseUrlToKey(url))) break
                await new Promise((resolve) => setTimeout(resolve, 50))
            }
            await browser.close();
        }, 10000);


        it ('clicked correct elements', async () => {
            const resultEntry = outputHandler.outputFile[parseUrlToKey(url)]
            expect(expected.length).toBe(resultEntry.actual.length)
            for (let i = 0; i < expected.length; i++) {
                expect(resultEntry.actual[i].xpath.trim()).toBe(expected[i].trim())
            }
        })
    });
}
