import { SESSION_STORAGE, LOADING_TIMEOUT } from "./config";
import { ProcessManager } from "./process";


function main() {
    if (SESSION_STORAGE.get('AEC') === null){
        setTimeout(async () => {
            await new ProcessManager().init()
        }, LOADING_TIMEOUT)
    }
}

window.onload = main