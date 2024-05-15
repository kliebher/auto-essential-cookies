const QUERY = 'span, p, h3, h2, h4, aside, [id*="policy"], [id*="consent"], [id*="cookie"]'
const KEYWORDS = {
    'DENY': ["ablehnen", "alle ablehnen", "reject", "decline", "notwendig", "auswahl"],
    'SETTINGS': ["settings", "einstellungen", "customize", "individuell", "purpose"],
    'CONFIRM': ["essenziell", "essential", "confirm my choices", "confirm choices", "save", "speichern", "selected", "ausgewählt"],
}
const INITIAL_TAB_KEYWORDS = [KEYWORDS.DENY, KEYWORDS.SETTINGS]
const SETTINGS_TAB_KEYWORDS = [KEYWORDS.DENY, KEYWORDS.CONFIRM]
const LOADING_TIMEOUT = 500


class Command {
    execute() {
        throw new Error('execute() must be implemented')
    }
}


class FindCookieRelatedNodes extends Command {
    constructor(result, query = QUERY) {
        super()
        this.result = result
        this.invalidTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
        this.query = query
        this.retried = false
    }

    execute() {
        const queryNodes = this.getQueryNodes()
        for (const node of queryNodes) {
            if (this.isCookieRelated(node)) {
                this.result.push(node)
                continue
            }
            this.checkForShadowRoot(node)
        }
        this.retry()
    }

    getQueryNodes() {
        return document.querySelectorAll(this.query)
    }

    isCookieRelated(node) {
        const nodeInnerText = node.innerText.toLowerCase();
        if (this.invalidTags.has(node.tagName.toLowerCase())) return false
        if (node.nodeType !== Node.ELEMENT_NODE) return false
        return nodeInnerText.includes('cookies') || nodeInnerText.includes('privacy')
    }

    checkForShadowRoot(node) {
        if (!node.shadowRoot || !node.shadowRoot.childNodes) return
        for (const childNode of node.shadowRoot.childNodes) {
            if (this.isCookieRelated(childNode)) {
                this.result.push(childNode)
            }
        }
    }

    retry() {
        if (this.result.length > 0 || this.retried) return
        this.query = 'div'
        this.retry = true
        this.execute()
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

class CreateCookieBannerObject extends Command {
    constructor(roots) {
        super()
        this.roots = roots
    }

    execute() {
        for (let i = 0; i < this.roots.length; i++) {
            this.roots[i] = new CookieBanner(this.roots[i])
        }
    }
}

class CookieBanner {
    constructor(root) {
        this.root = root
        this.actionElements = {}
        this.actions = []
    }
}

class CookieBannerAction {
    constructor(element, type) {
        this.element = element;
        this.type = type;
    }
}

class FindActionNodes extends Command {
    constructor(banner) {
        super()
        this.banner = banner
    }

    execute() {
        for (const banner of this.banner) {
            banner.actionElements['buttons'] = this.getButtons(banner.root)
            banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root)
            banner.actionElements['links'] = this.getLinks(banner.root)
        }
    }

    getButtons(root) {
        return Array.from(root.querySelectorAll('button'));
    }

    getCheckboxes(root) {
        return Array.from(root.querySelectorAll('input[type="checkbox"]'));
    }

    getLinks(root) {
        return Array.from(root.querySelectorAll('a'));
    }
}

class ClassifyActionNodes extends Command {
    constructor(cookieBanners, keywordLists) {
        super()
        this.cookieBanners = cookieBanners
        this.keywordLists = keywordLists
    }

    execute() {
        for (const banner of this.cookieBanners) {
            const actionNodesQueue = this.createActionNodesQueue(banner)
            const result = this.findMatchingKeywords(actionNodesQueue)
            if (result) {
                this.createBannerAction(banner, result)
            }
        }
    }

    createActionNodesQueue(banner) {
        return [banner.actionElements.buttons, banner.actionElements.links]
    }

    findMatchingKeywords(actionNodesQueue) {
        for (const keywordList of this.keywordLists) {
            while (actionNodesQueue.length > 0) {
                const actionNodes = actionNodesQueue.shift()
                const matches = this.findMatches(actionNodes, keywordList)
                if (matches) {
                    return this.handleMatches(matches, this.getActionType(keywordList))
                }
            }
        }
    }

    findMatches(actionNodes, keywords) {
        return actionNodes.filter(node => {
            const nodeInnerText = node.innerText.toLowerCase();
            if (!nodeInnerText) return false
            return keywords.some(keyword => nodeInnerText.includes(keyword))
        });
    }

    handleMatches(matches, actionType) {
        const firstMatch = matches.shift()
        return [firstMatch, actionType]
    }

    getActionType(keywords) {
        for (const [keywordListType, keywordList] of Object.entries(KEYWORDS)) {
            if (keywordList === keywords) return keywordListType
        }
        return null
    }

    createBannerAction(banner, findKeywordResult) {
        const [node, actionType] = findKeywordResult
        const action = new CookieBannerAction(node, actionType)
        banner.actions.push(action)
    }
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
            new CreateCookieBannerObject(this.banners),
            new FindActionNodes(this.banners),
            new ClassifyActionNodes(this.banners, INITIAL_TAB_KEYWORDS),
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