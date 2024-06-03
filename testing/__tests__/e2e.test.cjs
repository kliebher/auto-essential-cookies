const puppeteer = require('puppeteer')
const path = require('path')
const EXPECTED_RESULTS = require('../__data__/data.cjs');
const outputHandler = require('../utility/output_handler.cjs')
const testResultHandleServer = require('../server.cjs')

const store = { currentKey: "NOT_DEFINED", status: "init" }
const pathToExtension = path.join(__dirname, '../..');
const configPT = {
    args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`
    ],
    headless: false
}

let server = null

beforeAll(() => {
    server = new testResultHandleServer(store)
})

afterAll(() => {
    server.stop()
})

for (const { url, expected } of EXPECTED_RESULTS){
    describe(url, () => {

        test("set new result key", () =>{
            store.currentKey = url
            expect(store.currentKey).toBe(url)
            store.status = "wait"
        })

        test('open the page & wait for result', async () => {
            const browser = await puppeteer.launch(configPT);
            const page = await browser.newPage()
            await page.goto(url);
            while (1) {
                if (store.status === 'done') break
                await new Promise((resolve) => setTimeout(resolve, 50))
            }
            await browser.close();
        }, 5000);

        test ('clicked correct elements', async () => {
            const resultEntry = outputHandler.getResult(store.currentKey)
            expect(expected.length).toBe(resultEntry.clicked.length)
            for (let i = 0; i < expected.length; i++) {
                expect(resultEntry.clicked[i].xpath.trim()).toBe(expected[i].trim())
            }
        })
    });
}
