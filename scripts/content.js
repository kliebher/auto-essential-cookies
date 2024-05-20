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
    constructor(result, query = COOKIE_QUERY) {
        super()
        this.result = result
        this.invalidTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
        this.query = query
        this.retried = false
    }

    async execute() {
        await new Promise((resolve) => {
            this.validateQueryNodes()
            if (this.result.length === 0 && !this.retried)
                this.retry()
            resolve()
        })
    }

    validateQueryNodes() {
        const queryNodes = this.getQueryNodes()
        for (const node of queryNodes) {
            if (this.isCookieRelated(node)) {
                this.result.push(node)
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

    retry() {
        this.query = 'div'
        this.retried = true
        this.validateQueryNodes()
    }
}

class IdentifyUniqueRoots extends Command {
    constructor(result) {
        super()
        this.result = result
        this.invalidStartTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta', 'strong']);
        this.invalidRootTags = new Set(['p', 'span', 'h2', 'h3', 'h4']);
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.result.length; i++) {
                const node = this.result[i];
                const topLevelParentNode = this.identifyTopLevelParentNode(node);
                if (this.isValidRoot(node, topLevelParentNode)) {
                    this.result[i] = topLevelParentNode;
                } else {
                    this.result.splice(i--, 1);
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
        return !(this.result.includes(topLevelParentNode) && node !== topLevelParentNode);
    }
}

class CreateCookieBannerObject extends Command {
    constructor(result) {
        super()
        this.result = result
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.result.length; i++) {
                this.result[i] = new CookieBanner(this.result[i])
            }
            resolve()
        })
    }
}

class DetectAboModel extends Command {
    constructor(result) {
        super();
        this.result = result
    }

    execute() {
        if (this.result.length === 0) return
        for (let i = 0; i < this.result.length; i++) {
            const banner = this.result[i]
            if (this.isAboModel(banner.root)) {
                this.result.splice(i--, 1)
                if (this.result.length === 0) {
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
    constructor(result) {
        super()
        this.result = result
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            for (const banner of this.result) {
                banner.actionElements['buttons'] = this.getButtons(banner.root)
                banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root)
                banner.actionElements['links'] = this.getLinks(banner.root)
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
    constructor(result, keywordLists, state) {
        super()
        this.result = result
        this.keywordLists = keywordLists
        this.state = state
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            for (let i = 0; i < this.result.length; i++) {
                const banner = this.result[i]
                const actionNodesQueue = this.createActionNodesQueue(banner)
                const result = this.findMatchingKeywords(actionNodesQueue)
                result ? this.createBannerAction(banner, result) : this.result.splice(i--, 1)
            }
            if (this.state.bannersInProgress === -1)
                this.state.bannersInProgress = this.result.length

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
        const actionAlreadyPerformed = this.state.actionsPerformed.includes(firstMatch)
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
        this.state.actionsPerformed.push(node)
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
    constructor(result) {
        super()
        this.result = result
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            for (const result of this.result) {
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
    constructor(result, state) {
        super()
        this.result = result
        this.state = state
        this.CommandProvider = new CommandSequenceProvider(this.state)
    }

    async execute() {
        if (this.result.length === 0) return
        await new Promise((resolve) => {
            const completedBanners = this.result.filter(banner => banner.completed)
            this.state.bannersInProgress -= completedBanners.length
            if (this.state.bannersInProgress === 0) {
                sessionStorage.setItem('AEC', 'done')
                return
            }
            if (!this.state.addedCommands) this.addSubsequentCommands()
            resolve()
        })
        // wait for DOM to update after click
        await timeout()
    }

    addSubsequentCommands() {
        this.result.filter(banner => !banner.completed).forEach(bannerInProgress => {
            this.state.commandsToBeAdded.push(
                [[bannerInProgress], this.CommandProvider.get(true, true)]
            )
        })
        this.state.commandsToBeAdded.push([[], this.CommandProvider.get(false, true)])
        this.state.addedCommands = true
    }
}

const COMMAND_SEQUENCE_FULL_DOM = (keywords, state) => {
    return [
        new FindCookieRelatedNodes(state.result),
        new IdentifyUniqueRoots(state.result),
        new CreateCookieBannerObject(state.result),
        new DetectAboModel(state.result),
        new FindActionNodes(state.result),
        new ClassifyActionNodes(state.result, keywords, state),
        new ExecuteAction(state.result),
        new CheckState(state.result, state)
    ]
}

const COMMAND_SEQUENCE_SAME_ROOT = (keywords, state) => {
    return [
        new FindActionNodes(state.result),
        new ClassifyActionNodes(state.result, keywords, state),
        new ExecuteAction(state.result),
        new CheckState(state.result, state)
    ]
}

class CommandSequenceProvider {
    constructor(state) {
        this.state = state;
    }

    get(sameRoot = false, settings = false) {
        const sequence = sameRoot ? COMMAND_SEQUENCE_SAME_ROOT : COMMAND_SEQUENCE_FULL_DOM
        const keywords = settings ? SETTINGS_TAB_KEYWORDS : INITIAL_TAB_KEYWORDS
        return sequence(keywords, this.state)
    }
}

class CommandExecutor {

    constructor() {
        this.currentCommands = []
        this.commandQueue = new CommandQueue()
    }

    addCommands(...commands) {
        this.clearCommands()
        commands.forEach(command => this.currentCommands.push(command))
    }

    async executeCommands() {
        for (const command of this.currentCommands) {
            await command.execute()
        }
    }

    clearCommands() {
        this.currentCommands = []
    }

    setNextCommandSequence() {
        const next = this.commandQueue.getNext()
        this.addCommands(...next.sequence)
        return next.result
    }

    addCommandQueueItem(result, sequence) {
        this.commandQueue.add(result, sequence)
    }
}

class CommandQueue {
    constructor() {
        this.queue = []
    }

    add(result, sequence) {
        this.queue.push(new CommandQueueItem(result, sequence))
    }

    getNext() {
        return this.queue.shift()
    }

    hasNext() {
        return this.queue.length > 0
    }
}

class CommandQueueItem {
    constructor(result, sequence) {
        this.result = result
        this.sequence = sequence
    }
}

class ProcessState {
    constructor() {
        this.bannersInProgress = -1
        this.result = []
        this.addedCommands = false
        this.commandsToBeAdded = []
        this.actionsPerformed = []
    }
}

class ProcessManager {
    constructor() {
        this.ProcessState = new ProcessState()
        this.CommandExecutor = new CommandExecutor()
        this.CommandProvider = new CommandSequenceProvider(this.ProcessState)
    }

    async init() {
        this.ProcessState.commandsToBeAdded.push([[], this.CommandProvider.get()])
        this.CommandExecutor.addCommandQueueItem(...this.ProcessState.commandsToBeAdded.shift())
        do {
            this.ProcessState.result = this.CommandExecutor.setNextCommandSequence()
            await this.CommandExecutor.executeCommands()
            const nextCommandSequence = this.ProcessState.commandsToBeAdded.shift()
            if(!nextCommandSequence) break
            this.CommandExecutor.addCommandQueueItem(...nextCommandSequence)
        } while (this.CommandExecutor.commandQueue.hasNext())
    }
}


function main() {
    if (sessionStorage.getItem('AEC') === null) {
        setTimeout(async () => {
            await new ProcessManager().init()
        }, LOADING_TIMEOUT)
    }
}

window.onload = main