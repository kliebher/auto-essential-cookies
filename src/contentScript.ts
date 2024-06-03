import { SESSION_STORAGE, LOADING_TIMEOUT } from "./config";
import { ProcessManager } from "./process";

let MAX_RETRY = 3

async function run() {
    setTimeout(async () => {
        await new ProcessManager().init()
        const status = SESSION_STORAGE.get('AEC')
        if (status === 'done') return
        if (MAX_RETRY-- > 0) {
            await run()
        } else {
            SESSION_STORAGE.set('AEC', 'done')
            return
        }
    }, LOADING_TIMEOUT)
}

async function main() {
    if (SESSION_STORAGE.get('AEC') === null){
        SESSION_STORAGE.set('AEC', 'in_progress')
        await run()
    }
}

window.onload = main