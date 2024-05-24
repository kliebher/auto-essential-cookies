const COOKIE_QUERY = 'span, p, h3, h2, h4, aside, [id*="policy"], [id*="consent"], [id*="message-container"]' +
    '[id*="cookie"], [aria-label*="policy"], [aria-label*="consent"], [aria-label*="cookie"], [class*="message-container"]'
const KEYWORDS = {
    'DENY': ["ablehnen", "alle ablehnen", "reject", "decline", "notwendig", "auswahl"],
    'SETTINGS': ["settings", "einstellungen", "customize", "individuell", "purpose"],
    'CONFIRM': ["essenziell", "essential", "confirm my choices", "confirm choices", "save", "speichern", "selected", "ausgewählt"],
}
const INITIAL_TAB_KEYWORDS = [KEYWORDS.DENY, KEYWORDS.SETTINGS, KEYWORDS.CONFIRM]
const SETTINGS_TAB_KEYWORDS = [KEYWORDS.DENY, KEYWORDS.CONFIRM]
const LOADING_TIMEOUT = 500


function timeout(ms = LOADING_TIMEOUT) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}


class Command {
    execute() {
        throw new Error('execute() must be implemented')
    }
}

class CookieBanner {
    constructor(root) {
        this.root = root
        this.actionElements = {}
        this.actions = []
        this.executedActions = []
        this.completed = false
    }
}

class CookieBannerAction {
    constructor(element, type) {
        this.element = element;
        this.type = type;
    }

    execute() {
        this.element.click()
        return this.isBannerCompleted()
    }

    isBannerCompleted() {
        return this.type !== 'SETTINGS'
    }
}


class FindCookieRelatedNodes extends Command {
    constructor(state, query = COOKIE_QUERY) {
        super()
        this.state = state
        this.invalidTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
        this.query = query
        this.retried = false
    }

    async execute() {
        await new Promise((resolve) => {
            this.validateQueryNodes()
            if (this.state.result.length === 0 && !this.retried)
                this.retry()
            resolve()
        })
    }

    validateQueryNodes() {
        const queryNodes = this.getQueryNodes()
        for (const node of queryNodes) {
            if (this.isCookieRelated(node) && !this.inFooter(node)) {
                this.state.result.push(node)
                continue
            }
            this.checkForShadowRoot(node)
        }
    }

    getQueryNodes() {
        return document.querySelectorAll(this.query)
    }

    isCookieRelated(node) {
        if (!node.innerText) return false
        const nodeInnerText = node.innerText.toLowerCase();
        if (this.invalidTags.has(node.tagName.toLowerCase())) return false
        // if (node.nodeType !== Node.ELEMENT_NODE) return false
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

    inFooter(node) {
        const footer = document.querySelector('footer')
        return footer ? footer.contains(node) : false
    }

    retry() {
        this.query = 'div'
        this.retried = true
        this.validateQueryNodes()
    }
}

class IdentifyUniqueRoots extends Command {
    constructor(state) {
        super()
        this.state = state
        this.invalidStartTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta', 'strong']);
        this.invalidRootTags = new Set(['p', 'span', 'h2', 'h3', 'h4']);
    }

    async execute() {
        if (this.state.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.state.result.length; i++) {
                const node = this.state.result[i];
                const topLevelParentNode = this.identifyTopLevelParentNode(node);
                if (this.isValidRoot(node, topLevelParentNode)) {
                    this.state.result[i] = topLevelParentNode;
                } else {
                    this.state.result.splice(i--, 1);
                }
            }
            resolve()
        })
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

    isValidRoot(node, topLevelParentNode) {
        if (this.invalidRootTags.has(topLevelParentNode.tagName.toLowerCase())) return false
        return !(this.state.result.includes(topLevelParentNode) && node !== topLevelParentNode);
    }
}

class CreateCookieBannerObject extends Command {
    constructor(state) {
        super()
        this.state = state
    }

    async execute() {
        if (this.state.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.state.result.length; i++) {
                this.state.result[i] = new CookieBanner(this.state.result[i])
            }
            resolve()
        })
    }
}

class DetectAboModel extends Command {
    constructor(state) {
        super();
        this.state = state
    }

    execute() {
        if (this.state.result.length === 0) return
        for (let i = 0; i < this.state.result.length; i++) {
            const banner = this.state.result[i]
            if (this.isAboModel(banner.root)) {
                this.state.result.splice(i--, 1)
                if (this.state.result.length === 0) {
                    createToast('Abonnement Banner')
                    sessionStorage.setItem('AEC', 'done')
                }
            }
        }
    }

    isAboModel(root) {
        const aboModelKeywords = ['mit werbung', 'with advertising']
        const rootInnerText = root.innerText.toLowerCase()
        return aboModelKeywords.some(keyword => rootInnerText.includes(keyword))
    }
}

class FindActionNodes extends Command {
    constructor(state) {
        super()
        this.state = state
    }

    async execute() {
        if (this.state.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.state.result.length; i++) {
                const banner = this.state.result[i]
                banner.actionElements['buttons'] = this.getButtons(banner.root)
                banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root)
                banner.actionElements['links'] = this.getLinks(banner.root)
                if (Object.values(banner.actionElements).every(actions => actions.length === 0)) {
                    this.state.result.splice(i--, 1)
                }
            }
            resolve()
        })
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
    constructor(state, keywordLists) {
        super()
        this.state = state
        this.keywordLists = keywordLists
    }

    async execute() {
        if (this.state.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.state.result.length; i++) {
                const banner = this.state.result[i]
                const actionNodesQueue = this.createActionNodesQueue(banner)
                const result = this.findMatchingKeywords(actionNodesQueue)
                result ? this.createBannerAction(banner, result) : this.state.result.splice(i--, 1)
                result ? banner.root.style.opacity = '0' : banner.root.style.opacity = '1'
            }
            if (this.state.bannersInProgress === -1)
                this.state.bannersInProgress = this.state.result.length

            resolve()
        })
    }

    createActionNodesQueue(banner) {
        return [banner.actionElements.buttons, banner.actionElements.links]
    }

    findMatchingKeywords(actionNodesQueue) {
        for (const keywordList of this.keywordLists) {
            for (const actionNodes of actionNodesQueue) {
                if (actionNodes.length === 0) continue
                const matches = this.findMatches(actionNodes, keywordList)
                if (matches.length > 0) {
                    return this.handleMatches(matches, this.getActionType(keywordList))
                }
            }
        }
        return null
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
        let result = [firstMatch, actionType]
        result = this.checkForCombinedActions(result)
        const actionAlreadyPerformed = this.state.clickedElements.includes(firstMatch)
        return actionAlreadyPerformed ? null : result
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
        this.state.clickedElements.push(node)
        // banner.root.style.opacity = '0'
        banner.actions.push(action)
    }

    checkForCombinedActions(findKeywordResult) {
        const [node, actionType] = findKeywordResult
        if (actionType === 'DENY') {
            const actionToLookFor = 'SETTINGS'
            const combinedResult = this.findMatches([node], KEYWORDS[actionToLookFor])
            if (combinedResult.length > 0) {
                return [node, actionToLookFor]
            }
        }
        return findKeywordResult
    }
}

class ExecuteAction extends Command {
    constructor(state) {
        super()
        this.state = state
    }

    async execute() {
        if (this.state.result.length === 0) return
        await new Promise((resolve) => {
            for (const result of this.state.result) {
                this.unselectCheckboxes(result.actionElements.checkboxes)
                this.executeAction(result)
            }
            resolve()
        })
    }

    executeAction(banner) {
        const action = banner.actions.shift()
        banner.completed = action.execute()
        banner.executedActions.push(action)
    }

    unselectCheckboxes(checkboxes) {
        checkboxes.forEach(checkbox => checkbox.checked = false)
    }
}

class CheckState extends Command {
    constructor(state) {
        super()
        this.state = state
    }

    async execute() {
        await new Promise((resolve) => {
            this.handleNoResult() ? resolve() : this.handleResult()
            if (!this.state.addedCommands && this.state.bannersInProgress > 0)
                this.addSubsequentCommands()
            resolve()
        })
        // wait for DOM to update after click
        await timeout()
    }

    handleNoResult() {
        if (this.state.result.length === 0 && this.state.bannersInProgress === -1) {
            sessionStorage.setItem('AEC', 'done')
            return true
        }
        else if (this.state.result.length === 0) return true
        return false
    }

    handleResult() {
        const completedBanners = this.state.result.filter(banner => banner.completed)
        this.state.bannersInProgress -= completedBanners.length
        if (this.state.bannersInProgress === 0) {
            sessionStorage.setItem('AEC', 'done')
            this.state.printTime()
            createToast()
        }
    }

    addSubsequentCommands() {
        this.state.result.filter(banner => !banner.completed).forEach(bannerInProgress => {
            this.state.addCommandSequence(true, true, [bannerInProgress])
        })
        this.state.addCommandSequence(false, true)
        this.state.addedCommands = true
    }
}


class CommandSequenceProvider {
    constructor() {}

    static get(state, sameRoot = false, settings = false) {
        const sequence = sameRoot ? this.COMMAND_SEQUENCE_SAME_ROOT : this.COMMAND_SEQUENCE_FULL_DOM
        const keywords = settings ? SETTINGS_TAB_KEYWORDS : INITIAL_TAB_KEYWORDS
        return sequence(keywords, state)
    }

    static COMMAND_SEQUENCE_FULL_DOM = (keywords, state) => {
        return [
            new FindCookieRelatedNodes(state),
            new IdentifyUniqueRoots(state),
            new CreateCookieBannerObject(state),
            new DetectAboModel(state),
            new FindActionNodes(state),
            new ClassifyActionNodes(state, keywords),
            new ExecuteAction(state),
            new CheckState(state)
        ]
    }

    static COMMAND_SEQUENCE_SAME_ROOT = (keywords, state) => {
        return [
            new FindActionNodes(state),
            new ClassifyActionNodes(state, keywords),
            new ExecuteAction(state),
            new CheckState(state)
        ]
    }
}

class CommandExecutor {

    constructor(state) {
        this.state = state
    }

    async executeCommands() {
        const [ startingPoint, commandSequence ] = this.state.getNextCommandSequence()
        this.state.result = startingPoint
        for (const command of commandSequence) {
            await command.execute()
        }
    }
}

class ProcessState {
    constructor() {
        this.bannersInProgress = -1
        this.result = []
        this.addedCommands = false
        this.nextCommands = []
        this.clickedElements = []
        this.startedAt = null
    }

    addCommandSequence(sameRoot = false, settings = false, startingPoint = []) {
        this.nextCommands.push([startingPoint, CommandSequenceProvider.get(this, sameRoot, settings)])
    }

    getNextCommandSequence() {
        return this.nextCommands.shift()
    }

    setStartingTime() {
        this.startedAt = performance.now()
    }

    printTime() {
        const time = (performance.now() - this.startedAt).toFixed(1)
        colorTrace(`AutoEssentialCookies executed in ${time}ms`, 'lightgreen')

        function colorTrace(msg, color) {
            // https://stackoverflow.com/questions/9332979/change-console-log-message-color#10769621
            console.log("%c" + msg, "color:" + color + ";font-weight:bold;");
        }
    }
}

class ProcessManager {
    constructor() {
        this.ProcessState = new ProcessState()
        this.CommandExecutor = new CommandExecutor(this.ProcessState)
    }

    async init() {
        this.ProcessState.setStartingTime()
        this.ProcessState.addCommandSequence()
        while (this.ProcessState.nextCommands.length > 0) {
            await this.CommandExecutor.executeCommands()
        }
    }
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

    for (const key in style) {
        toast.style[key] = style[key];
    }

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

function main() {
    if (sessionStorage.getItem('AEC') === null) {
        setTimeout(async () => {
            await new ProcessManager().init()
        }, LOADING_TIMEOUT)
    }
}

window.onload = main