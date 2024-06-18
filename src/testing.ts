const LOCAL_STORAGE_KEY = 'AEC_testResult'
const TEST_ENGINE_URL = 'http://localhost:3000'

type TestResult = { clicked: string[], time: string, elements: number }

const testResultDefault: TestResult = {
    "clicked": [],
    "time": "",
    "elements": 0
}

function getXPathByElement(element: HTMLElement): string {
    // https://stackoverflow.com/questions/2661818/javascript-get-xpath-of-a-node
    const idx: any = (sib: HTMLElement | null, name: string) => sib
        ? idx(sib.previousElementSibling as HTMLElement, name||sib.localName) + (sib.localName == name)
        : 1;
    const segs: any = (elm: HTMLElement) => !elm || elm.nodeType !== 1
        ? ['']
        : [...segs(elm.parentNode), `${elm.localName.toLowerCase()}[${idx(elm)}]`];
    return segs(element).join('/').replaceAll('[1]', '');
}

export class TestResultHandler  {
    key: string = LOCAL_STORAGE_KEY
    axios = require('axios')

    addXpath(element: HTMLElement): void {
        const xpath = getXPathByElement(element)
        const current = localStorage.getItem(this.key)
        const parsed = current ? JSON.parse(current) : testResultDefault
        if (parsed) {
            parsed.clicked.push({xpath: xpath, text: element.innerText})
        }
        localStorage.setItem(this.key, JSON.stringify(parsed))
    }

    setStartTime() {
        const current = localStorage.getItem(this.key)
        const parsed = current ? JSON.parse(current) : testResultDefault
        if (parsed) {
            parsed.time = performance.now()
        }
        localStorage.setItem(this.key, JSON.stringify(parsed))
    }

    setElementsInRoot(amount: number) {
        const current = localStorage.getItem(this.key)
        const parsed = current ? JSON.parse(current) : testResultDefault
        if (parsed) {
            parsed.elements = amount
        }
        localStorage.setItem(this.key, JSON.stringify(parsed))
    }

    async sendResults() {
        const current = localStorage.getItem(this.key)
        const parsed = current ? JSON.parse(current) : testResultDefault
        parsed.time = (performance.now() - parsed.time).toFixed(2)
        await this.axios.post(TEST_ENGINE_URL, parsed)
    }
}