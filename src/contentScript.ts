import { SESSION_STORAGE, INITIAL_TIMEOUT } from "./config";
import { ProcessManager } from "./process";

const dynamicallyLoaded: HTMLElement[] = []
const validTags = new Set<string>(['IFRAME', 'DIV', 'ASIDE'])
const observerConfig: {[key: string]: boolean} = { childList: true, subtree: true }
const containsCookie = new RegExp(/Cookies|cookies|Cookie|cookie/gm)
let executedScript = false
let retryHandler: NodeJS.Timeout
let observer: MutationObserver = new MutationObserver(observerCallback)
const additionalWaitingTime = 1500
let processDoneAt = -1

function observerCallback(records: MutationRecord[]) {
    let filtered = records.filter((record: MutationRecord) => {
        return record.type === 'childList' && record.addedNodes.length > 0
    })
    if (!filtered.length) return

    let validAddedNodes: Node[] = []
    for (const record of filtered) {
        validAddedNodes.push(...Array.from(record.addedNodes))
    }

    if (!validAddedNodes.length) return

    for (const addedNode of validAddedNodes) {
        const element = addedNode as HTMLElement
        if (!dynamicallyLoaded.includes(element)) {
            dynamicallyLoaded.push(element)
            // console.log('[DYNAMICALLY ADDED]', element)
        }
    }
}

function retryHandlerCallback() {
    if (!executedScript) return
    else if (processDoneAt === -1) processDoneAt = performance.now()

    if (currentOriginDone()) closeHandler()
    else {
        const cookieRelated = validateDynamicallyLoadedNodes()
        if (cookieRelated) {
            closeHandler()
            run(0, true, cookieRelated)
        }
        else {
            const passedTime = performance.now() - processDoneAt
            if (passedTime >= additionalWaitingTime) closeHandler()
        }
    }
}

function closeHandler() {
    clearInterval(retryHandler)
    observer.disconnect()
}

const currentOriginDone = () => SESSION_STORAGE.get('AEC') === 'done'

function isCookieRelated(node: HTMLElement): boolean {
    return containsCookie.test(node.innerText) || containsCookie.test(node.ariaLabel!)
}

function validateDynamicallyLoadedNodes(): HTMLElement[] | null {
    const valid: HTMLElement[] = []
    for (const element of dynamicallyLoaded) {
        if (element.shadowRoot) {
            const result = handleShadowRoot(element)
            if (result) valid.push(result)
        } else if (validTags.has(element.tagName) && isCookieRelated(element)) {
            valid.push(element)
        }
    }
    return valid.length > 0 ? valid : null
}

function handleShadowRoot(element: HTMLElement): HTMLElement | null {
    if (!element || !element.shadowRoot || !element.shadowRoot.childNodes) return null
    for (let childNode  of Array.from(element.shadowRoot.childNodes)) {
        const child = childNode as HTMLElement
        if (!validTags.has(child.tagName)) continue
        if (!isCookieRelated(child)) continue
        return child
    }
    return null
}


function run(timeout: number = INITIAL_TIMEOUT, retry: boolean = false, arg: HTMLElement[] = []) {
    setTimeout(async () => {
        const manager = new ProcessManager()
        retry ? await manager.init(arg) : await manager.init()
        executedScript = retry ? executedScript : true
    }, timeout)
}

function originRootVisible (el: HTMLElement | Element) {
    const style = window.getComputedStyle(el)
    if (style.width === 'auto' && style.height === 'auto') return false
    else if (style.display === 'none') return false
    return true
}

function main() {
    if (SESSION_STORAGE.get('AEC') === null && originRootVisible(document.documentElement)){
        observer.observe(document.documentElement, observerConfig)
        retryHandler = setInterval(retryHandlerCallback, 200)
        run()
    }
}

window.onload = main