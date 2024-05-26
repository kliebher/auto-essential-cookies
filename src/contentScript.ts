const COOKIE_QUERY = 'span, p, h3, h2, h4, aside, [id*="policy"], [id*="consent"], [id*="message-container"]' +
    '[id*="cookie"], [aria-label*="policy"], [aria-label*="consent"], [aria-label*="cookie"], [class*="message-container"]'
const KEYWORDS = {
    'DENY': ["ablehnen", "alle ablehnen", "reject", "decline", "notwendig", "auswahl"],
    'SETTINGS': ["settings", "einstellungen", "customize", "individuell", "purpose"],
    'CONFIRM': ["essenziell", "essential", "confirm my choices", "confirm choices", "save", "speichern", "selected", "ausgewählt"],
}

/** Types **/

enum CookieBannerActionType {
    DENY = 'DENY',
    SETTINGS = 'SETTINGS',
    CONFIRM = 'CONFIRM',
    UNSET = 'UNSET'
}

type StateResult = Array<HTMLElement | CookieBanner>


/** Interfaces & Abstract Classes **/

interface KeywordMatcher {
    keywords: Array<string>
    type: CookieBannerActionType
    hasMatch(txt: string): boolean
}

abstract class AbstractKeywordMatcher implements KeywordMatcher {
    abstract get keywords(): Array<string>;
    abstract get type(): CookieBannerActionType;

    hasMatch(txt: string): boolean {
        return this.keywords.some(keyword => txt.includes(keyword));
    }
}

class DenyKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.DENY

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.DENY;
    }
}

class SettingsKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.SETTINGS

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.SETTINGS;
    }
}

class ConfirmKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.CONFIRM

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.CONFIRM;
    }
}


abstract class Command {
    abstract execute(): Promise<void>
}

class CookieBanner {
    public root: HTMLElement
    public actionElements: { [key: string]: Array<HTMLElement> }
    public actions: Array<CookieBannerAction>
    public executedActions: Array<CookieBannerAction>
    public completed: boolean

    constructor(root: HTMLElement) {
        this.root = root
        this.actionElements = {}
        this.actions = []
        this.executedActions = []
        this.completed = false
    }
}

class CookieBannerAction {
    private element: HTMLElement
    private readonly type: CookieBannerActionType

    constructor(element: HTMLElement, type: CookieBannerActionType) {
        this.element = element;
        this.type = type;
    }

    execute() {
        this.element.click()
        return this.isBannerCompleted()
    }

    private isBannerCompleted() {
        return this.type !== CookieBannerActionType.SETTINGS
    }
}

class ActionNodeClassificationResult {
    node: HTMLElement
    actionType: CookieBannerActionType

    constructor(node: HTMLElement, actionType: CookieBannerActionType) {
        this.node = node
        this.actionType = actionType
    }

    public updateActionType(actionType: CookieBannerActionType) {
        this.actionType = actionType
    }
}


/** Type Guards **/

function isHTMLElement(node: HTMLElement | CookieBanner): node is HTMLElement {
    return node instanceof HTMLElement || node instanceof Element
}

function isCookieBanner(node: HTMLElement | CookieBanner): node is CookieBanner {
    return Object.hasOwn(node, 'root')
}

/** Utility Classes **/

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

/** Constants **/
const DenyKeywordMatcher = new DenyKeywords()
const SettingsKeywordMatcher = new SettingsKeywords()
const ConfirmKeywordMatcher = new ConfirmKeywords()

const INITIAL_TAB_KEYWORDS: Array<KeywordMatcher> = [DenyKeywordMatcher, SettingsKeywordMatcher, ConfirmKeywordMatcher]
const SETTINGS_TAB_KEYWORDS: Array<KeywordMatcher> = [DenyKeywordMatcher, ConfirmKeywordMatcher]
const LOADING_TIMEOUT: number = 500 //ms
const SESSION_STORAGE = new SessionStorageHandler()


/** Class Implementations **/

class FindCookieRelatedNodes extends Command {
    public state: ProcessState
    private invalidHTMLTags: Set<string>
    private query: string
    private retried: boolean

    constructor(state: ProcessState, query: string = COOKIE_QUERY) {
        super()
        this.state = state
        this.invalidHTMLTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta']);
        this.query = query
        this.retried = false
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.findNodes()
            resolve()
        })
    }

    private findNodes() {
        const queryNodes = this.getQueryNodes()
        this.validateQueryNodes(queryNodes)
        if (this.state.result.length === 0 && !this.retried)
            this.retry()
    }

    private validateQueryNodes(queryNodes: Array<HTMLElement>): void {
        for (const node of queryNodes) {
            if (this.isCookieRelated(node) && !this.isFooterContent(node)) {
                this.state.result.push(node)
                continue
            }
            this.handleShadowRoot(node)
        }
    }

    private getQueryNodes(): Array<HTMLElement> {
        return Array.from(document.querySelectorAll(this.query))
    }

    private isCookieRelated(node: HTMLElement): boolean {
        if (!node.innerText) return false
        const nodeInnerText = node.innerText.toLowerCase();
        if (this.invalidHTMLTags.has(node.tagName.toLowerCase())) return false
        return nodeInnerText.includes('cookie')
    }

    private handleShadowRoot(node: HTMLElement): void {
        if (!node.shadowRoot || !node.shadowRoot.childNodes) return
        for (let childNode  of Array.from(node.shadowRoot.childNodes)) {
            const child = childNode as HTMLElement
            if (this.isCookieRelated(child)) {
                this.state.result.push(child)
            }
        }
    }

    private isFooterContent(node: HTMLElement): boolean {
        const footer = document.querySelector('footer')
        return footer ? footer.contains(node) : false
    }

    private retry(): void {
        this.query = 'div'
        this.retried = true
        this.findNodes()
    }
}

class IdentifyUniqueRoots extends Command {
    public state: ProcessState
    private invalidStartTags: Set<string>
    private invalidRootTags: Set<string>

    constructor(state: ProcessState) {
        super()
        this.state = state
        this.invalidStartTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta', 'strong']);
        this.invalidRootTags = new Set(['p', 'span', 'h2', 'h3', 'h4']);
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const node = this.state.result[i];
                if (!isHTMLElement(node)) {
                    continue
                }
                const topLevelParentNode = this.identifyTopLevelParentNode(node);
                if (topLevelParentNode && this.isValidRoot(node, topLevelParentNode)) {
                    this.state.result[i] = topLevelParentNode;
                    continue
                }
                this.state.removeResultAtIndex(i--)

            }
            resolve()
        })
    }


    private identifyTopLevelParentNode(node: HTMLElement): HTMLElement | null {
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

    private isValidRoot(node: HTMLElement, topLevelParentNode: HTMLElement | null): boolean {
        if (!topLevelParentNode) return false
        if (this.invalidRootTags.has(topLevelParentNode.tagName.toLowerCase())) return false
        return !(this.state.result.includes(topLevelParentNode) && node !== topLevelParentNode);
    }
}

class CreateCookieBannerObject extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            this.state.result.forEach((node, index) => {
                if (isHTMLElement(node)) this.parseCookieBanner(node, index)
            })
            resolve()
        })
    }

    private parseCookieBanner(node: HTMLElement, nodeIndex: number): void {
        this.state.result[nodeIndex] = new CookieBanner(node)
    }
}

class DetectAboModel extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super();
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (isCookieBanner(current) && this.isAboModel(current.root)) {
                    this.state.removeResultAtIndex(i--)
                    if (this.state.result.length === 0) {
                        createToast('Abonnement Banner')
                        SESSION_STORAGE.set('AEC', 'done')
                    }
                }
            }
            resolve()
        })
    }

    private isAboModel(root: HTMLElement) {
        const aboModelKeywords = ['mit werbung', 'with advertising']
        const rootInnerText = root.innerText.toLowerCase()
        return aboModelKeywords.some(keyword => rootInnerText.includes(keyword))
    }
}

class FindActionNodes extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (!isCookieBanner(current)) continue
                this.getActionNodes(current)
                if (!this.hasActionElements(current)) {
                    this.state.removeResultAtIndex(i--)
                }
            }
            resolve()
        })
    }

    private getActionNodes(banner: CookieBanner): void {
        banner.actionElements['buttons'] = this.getButtons(banner.root)
        banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root) as HTMLInputElement[]
        banner.actionElements['links'] = this.getLinks(banner.root)
    }

    private getButtons(root: HTMLElement): Array<HTMLButtonElement> {
        return Array.from(root.querySelectorAll('button'));
    }

    private getCheckboxes(root: HTMLElement): Array<Element> {
        return Array.from(root.querySelectorAll('input[type="checkbox"]'));
    }

    private getLinks(root: HTMLElement): Array<HTMLAnchorElement> {
        return Array.from(root.querySelectorAll('a'));
    }

    private hasActionElements(banner: CookieBanner): boolean {
        return !Object.values(banner.actionElements).every(actions => actions.length === 0)
    }
}

class ClassifyActionNodes extends Command {
    public state: ProcessState
    private readonly keywordLists: Array<KeywordMatcher>

    constructor(state: ProcessState, keywordLists: Array<KeywordMatcher>) {
        super()
        this.state = state
        this.keywordLists = keywordLists
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (!isCookieBanner(current)) continue
                const result = this.findMatchingKeywords(current)
                result ? this.createBannerAction(current, result) : this.state.removeResultAtIndex(i--)
            }
            this.state.setBannerInProgress(this.state.result.length)
            resolve()
        })
    }

    private findMatchingKeywords(banner: CookieBanner) {
        const actionNodesList: HTMLElement[][] = [banner.actionElements.buttons, banner.actionElements.links]
        for (const keywords of this.keywordLists) {
            for (const actionNodes of actionNodesList) {
                if (actionNodes.length === 0) continue
                const match = this.getFirstMatch(actionNodes, keywords)
                if (match && !this.actionAlreadyExecuted(match)) {
                    const result = new ActionNodeClassificationResult(match, keywords.type)
                    this.checkMultipleKeywordsMatch(result)
                    return result
                }
            }
        }
        return null
    }

    private getFirstMatch(actionNodes: Array<HTMLElement> | HTMLElement, keywords: KeywordMatcher): HTMLElement | null {
        actionNodes = Array.isArray(actionNodes) ? actionNodes : [actionNodes]
        return actionNodes.find(node => {
            const nodeInnerText = node.innerText.toLowerCase();
            return keywords.hasMatch(nodeInnerText)
        }) || null;
    }

    private actionAlreadyExecuted(match: HTMLElement): boolean {
        return this.state.clickedElements.includes(match)
    }

    private checkMultipleKeywordsMatch(result: ActionNodeClassificationResult): void {
        if (result.actionType === CookieBannerActionType.DENY) {
            const keywords = SettingsKeywordMatcher
            const multipleMatch = this.getFirstMatch(result.node, keywords)
            if (multipleMatch) result.updateActionType(keywords.type)
        }
    }

    private createBannerAction(banner: CookieBanner, result: ActionNodeClassificationResult): void {
        const action = new CookieBannerAction(result.node, result.actionType)
        this.state.clickedElements.push(result.node)
        banner.actions.push(action)
        this.hideCookieBanner(banner)
    }

    private hideCookieBanner(banner: CookieBanner) {
        banner.root.style.opacity = '0'
    }
}

class ExecuteAction extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (const result of this.state.result) {
                if (isCookieBanner(result)) {
                    this.unselectCheckboxes(result.actionElements.checkboxes as HTMLInputElement[])
                    this.executeAction(result)
                }
            }
            resolve()
        })
    }

    private executeAction(banner: CookieBanner) {
        const nextAction = banner.actions.shift()
        if (nextAction) {
            banner.completed = nextAction.execute()
            banner.executedActions.push(nextAction)
        }
    }

    private unselectCheckboxes(checkboxes: Array<HTMLInputElement>) {
        checkboxes.forEach(checkbox => checkbox.checked = false)
    }
}

class CheckState extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public async execute(): Promise<void> {
        return await new Promise<void>(async (resolve) => {
            this.handleNoResult() ? resolve() : this.handleResult()
            if (!this.state.addedCommands && this.state.bannersInProgress > 0) {
                this.addSubsequentCommands()
                // wait for DOM to update after click
                await timeout()
            }
            resolve()
        })
    }

    private handleNoResult() {
        if (this.state.result.length === 0 && this.state.bannersInProgress === -1) {
            SESSION_STORAGE.set('AEC', 'done')
            return true
        }
        else if (this.state.result.length === 0) return true
        return false
    }

    private handleResult() {
        const completedBanners = this.state.result
            .filter(banner => isCookieBanner(banner) && banner.completed)
        this.state.bannersInProgress -= completedBanners.length
        if (this.state.bannersInProgress === 0) {
            SESSION_STORAGE.set('AEC', 'done')
            this.state.printTime()
            createToast()
        }
    }

    private addSubsequentCommands() {
        this.state.result.filter(banner => isCookieBanner(banner) && !banner.completed)
            .forEach(bannerInProgress => {
                this.state.addCommandSequence(true, true, [bannerInProgress])
            })
        this.state.addCommandSequence(false, true)
        this.state.addedCommands = true
    }
}


class CommandSequenceProvider {
    constructor() {}

    static get(state: ProcessState, sameRoot: boolean = false, settings: boolean = false) {
        const sequence = sameRoot ? this.COMMAND_SEQUENCE_SAME_ROOT : this.COMMAND_SEQUENCE_FULL_DOM
        const keywords: Array<KeywordMatcher> = settings ? SETTINGS_TAB_KEYWORDS : INITIAL_TAB_KEYWORDS
        return sequence(keywords, state)
    }

    static COMMAND_SEQUENCE_FULL_DOM = (keywords: KeywordMatcher[], state: ProcessState) => {
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

    static COMMAND_SEQUENCE_SAME_ROOT = (keywords: KeywordMatcher[], state: ProcessState) => {
        return [
            new FindActionNodes(state),
            new ClassifyActionNodes(state, keywords),
            new ExecuteAction(state),
            new CheckState(state)
        ]
    }
}

class CommandExecutor {
    public state: ProcessState

    constructor(state: ProcessState) {
        this.state = state
    }

    public async executeCommands() {
        const next = this.state.commandQueue.getNext()
        if (next) {
            this.state.result = next.initialResult
            for (const command of next.sequence) {
                await command.execute()
            }
        }
    }
}

class CommandQueueItem {
    public readonly sequence: Command[]
    public readonly initialResult: StateResult

    constructor(sequence: Command[], startingPoint: StateResult) {
        this.sequence = sequence
        this.initialResult = startingPoint
    }
}

class CommandQueue {
    private commands: CommandQueueItem[]

    constructor() {
        this.commands = []
    }

    public addCommand(queueItem: CommandQueueItem) {
        this.commands.push(queueItem)
    }

    public getNext() {
        return this.commands.shift() || null
    }

    public hasNext(): boolean {
        return this.commands.length > 0

    }
}

class ProcessState {
    bannersInProgress: number
    result: StateResult
    addedCommands: boolean
    commandQueue: CommandQueue
    clickedElements: Array<HTMLElement>
    startedAt: number

    constructor() {
        this.bannersInProgress = -1
        this.result = []
        this.addedCommands = false
        this.commandQueue = new CommandQueue()
        this.clickedElements = []
        this.startedAt = -1
    }

    public removeResultAtIndex(index: number) {
        this.result.splice(index, 1)
    }

    addCommandSequence(sameRoot = false, settings = false, initialResult: StateResult = []) {
        const sequence = CommandSequenceProvider.get(this, sameRoot, settings)
        const queueItem = new CommandQueueItem(sequence, initialResult)
        this.commandQueue.addCommand(queueItem)
    }

    setStartingTime() {
        this.startedAt = performance.now()
    }

    printTime() {
        const time = (performance.now() - this.startedAt).toFixed(1)
        colorTrace(`Cookie Banner processed in ${time}ms`, 'lightgreen')
    }

    setBannerInProgress(bannersInProgress: number) {
        this.bannersInProgress = this.bannersInProgress === -1 ? bannersInProgress : this.bannersInProgress
    }
}

class ProcessManager {
    private readonly state: ProcessState
    private commandExecutor: CommandExecutor

    constructor() {
        this.state = new ProcessState()
        this.commandExecutor = new CommandExecutor(this.state)
    }

    async init() {
        this.state.setStartingTime()
        this.state.addCommandSequence()
        while (this.state.commandQueue.hasNext()) {
            await this.commandExecutor.executeCommands()
        }
    }
}

/** Utility Functions **/

function timeout(ms = LOADING_TIMEOUT) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
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

function colorTrace(msg: string, color: string) {
    // https://stackoverflow.com/questions/9332979/change-console-log-message-color#10769621
    console.log("%c" + msg, "color:" + color + ";font-weight:bold;");
}


function main() {
    if (SESSION_STORAGE.get('AEC') === null){
        setTimeout(async () => {
            await new ProcessManager().init()
        }, LOADING_TIMEOUT)
    }
}

window.onload = main