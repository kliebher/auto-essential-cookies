import { SESSION_STORAGE, INITIAL_TIMEOUT } from "./config";
import { ProcessManager } from "./process";

async function run() {
    setTimeout(async () => {
        await new ProcessManager().init()
    }, INITIAL_TIMEOUT)
}

async function main() {
    if (SESSION_STORAGE.get('AEC') === null && isVisible(document.documentElement)){
        // SESSION_STORAGE.set('AEC', 'in_progress')
        await run()
    }
}

function isVisible (el: HTMLElement | Element) {
    const style = window.getComputedStyle(el)
    // if (style.width === '0px' || style.height === '0px') return false;
    if (style.width === 'auto' && style.height === 'auto') return false
    else if (style.display === 'none') return false
    return true
}

window.onload = main