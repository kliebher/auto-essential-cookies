const QUERY = 'span, p, h3, h2, h4, aside, [id*="policy"], [id*="consent"], [id*="cookie"]'
const KEYWORDS = {
    'DENY': ["ablehnen", "alle ablehnen", "reject", "decline", "notwendig", "auswahl"],
    'SETTINGS': ["settings", "einstellungen", "customize", "individuell", "purpose"],
    'CONFIRM': ["essenziell", "essential", "confirm my choices", "confirm choices", "save", "speichern", "selected", "ausgewählt"],
}
const LOADING_TIMEOUT = 500


class Command {
    execute() {
        throw new Error('execute() must be implemented')
    }
}


class FindCookieRelatedNodes extends Command {
    constructor(result) {
        super()
        this.result = result
        this.invalidTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
    }

    execute() {
        const queryNodes = this.getQueryNodes()
        for (const node of queryNodes) {
            if (this.isCookieRelated(node)) {
                this.result.push(node)
                continue
            }

            if (this.hasShadowRoot(node) && node.shadowRoot.childNodes) {
                for (const childNode of node.shadowRoot.childNodes) {
                    if (this.isCookieRelated(childNode)) {
                        this.result.push(childNode)
                    }
                }

            }
        }
    }

    getQueryNodes() {
        return document.querySelectorAll(QUERY)
    }

    isCookieRelated(node) {
        const nodeInnerText = node.innerText.toLowerCase();
        if (this.invalidTags.has(node.tagName.toLowerCase())) return false
        if (node.nodeType !== Node.ELEMENT_NODE) return false
        return nodeInnerText.includes('cookies') || nodeInnerText.includes('privacy')
    }

    hasShadowRoot(node) {
        return !!node.shadowRoot
    }
}

class IdentifyUniqueRoots extends Command {
    constructor(cookieRelatedElements) {
        super()
        this.nodesToBeProcessed = cookieRelatedElements
        this.invalidStartTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
        this.invalidRootTags = new Set(['p', 'span', 'h2', 'h3', 'h4']);
    }

    execute() {
        for (let i = 0; i < this.nodesToBeProcessed.length; i++)  {
            const node = this.nodesToBeProcessed[i];
            const topLevelParentNode = this.identifyTopLevelParentNode(node);
            if (this.isValidRoot(topLevelParentNode)) {
                this.nodesToBeProcessed[i] = topLevelParentNode;
            }
            else {
                this.nodesToBeProcessed.splice(i, 1);
                i--
            }
        }
    }

    identifyTopLevelParentNode(node) {
        if (!node) return null;
        if (this.invalidStartTags.has(node.tagName.toLowerCase())) return null;
        if (node.parentElement === null) return node;

        const parentNodeTagName = node.parentElement.tagName.toLowerCase()
        if (this.invalidStartTags.has(parentNodeTagName)) return node;

        const styleParent = window.getComputedStyle(node.parentElement);
        if (styleParent.width === '0px' || styleParent.height === '0px') return node;
        if (styleParent.display === 'none' || styleParent.visibility === 'hidden') return node;

        return this.identifyTopLevelParentNode(node.parentElement);
    }

    isValidRoot(node) {
        if (this.nodesToBeProcessed.includes(node)) return false
        return !this.invalidRootTags.has(node.tagName.toLowerCase())
    }
}

class FindActionNodes extends Command {
    constructor(roots) {
        super()
        this.elements = roots
    }

    execute() {}

    getButtons(node) {}

    getCheckboxes(node) {}

    getLinks(node) {}
}

class ClassifyActionNodes extends Command {
    constructor(nodes) {
        super()
        this.nodes = nodes
    }

    execute() {}

    findMatchingKeywords(node) {}

    createBannerAction(node) {}
}

class ExecuteAction extends Command {
    constructor(action) {
        super()
        this.action = action
    }

    execute() {}

    unselectCheckboxes(node) {}
}

class CheckState extends Command {
    constructor(nodes) {
        super()
        this.nodes = nodes
    }

    execute() {}
}

class CookieBannerProcessor {
    constructor() {
        this.banners = []
        this.commands = []
        this.process()
    }

    process() {
        this.addCommands(
            new FindCookieRelatedNodes(this.banners),
            new IdentifyUniqueRoots(this.banners),
            // new FindActionNodes(this.banners),
            // new ClassifyActionNodes(this.banners),
            // new ExecuteAction(this.banners)
        )
        this.executeCommands()
    }

    addCommands(...commands) {
        commands.forEach(command => this.commands.push(command))
    }

    executeCommands() {
        this.commands.forEach(command => command.execute())
    }
}


function main() {
    setTimeout( () => {
        const CBP = new CookieBannerProcessor()
        console.log(CBP.banners)
    }, LOADING_TIMEOUT)

}

window.onload = main