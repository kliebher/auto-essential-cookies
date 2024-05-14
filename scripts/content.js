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
    constructor(nodes) {
        super()
        this.nodes = nodes
        this.invalidStartTags = []
        this.invalidRootTags = []
    }

    execute() {}

    identifyTopLevelParentNode(node) {}
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
            // new IdentifyUniqueRoots(this.banners),
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