import { type CookieBanner } from './types'


function isHTMLElement(node: HTMLElement | CookieBanner): node is HTMLElement {
    return node instanceof HTMLElement || node instanceof Element
}

function isCookieBanner(node: HTMLElement | CookieBanner): node is CookieBanner {
    return Object.hasOwn(node, 'root')
}

function timeout(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

function colorTrace(msg: string, color: string) {
    // https://stackoverflow.com/questions/9332979/change-console-log-message-color#10769621
    console.log("%c" + msg, "color:" + color + ";font-weight:bold;");
}

function createToast(msg = 'Cookies Managed') {
    const toast = document.createElement('div');

    const transitionDuration = 500;
    const visibleTime = 2000
    const transitionDelay = 250

    const style = {
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        backgroundColor: '#181818',
        color: '#f7f7f7',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '16px',
        zIndex: '999999',
        opacity: '0',
        visibility: 'hidden',
        transition: `opacity ${transitionDuration}ms, visibility ${transitionDuration}ms`,
        fontWeight : 'bold'
    };

    Object.assign(toast.style, style);

    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.visibility = 'visible';
    }, transitionDelay);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.visibility = 'hidden';

        setTimeout(() => {
            document.body.removeChild(toast);
        }, transitionDuration);
    }, visibleTime + transitionDelay);
}

class SessionStorageHandler {
    private static instance: SessionStorageHandler;

    constructor() {
        if (SessionStorageHandler.instance) {
            return SessionStorageHandler.instance;
        }

        SessionStorageHandler.instance = this;
    }

    get(key: string) {
        return sessionStorage.getItem(key);
    }

    set(key: string, value: string) {
        sessionStorage.setItem(key, value);
    }
}


export {
    isCookieBanner,
    isHTMLElement,
    timeout,
    colorTrace,
    createToast,
    SessionStorageHandler
}