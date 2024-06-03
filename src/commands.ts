import { type ProcessState } from './process'
import { SESSION_STORAGE, RESULT_HANDLER, SETTINGS_TAB_KEYWORDS, INITIAL_TAB_KEYWORDS } from "./config";
import { SettingsKeywordMatcher } from "./config";
import * as utility from "./utility";
import { CookieBanner, ActionClassifyResult, CookieBannerActionType, CookieBannerAction, type StateResult } from "./types";
import { type KeywordMatcher } from "./keywords";
import { COOKIE_QUERY, KNOWN_IDENTIFIERS } from "./data";

abstract class Command {
    abstract execute(): Promise<void>
}


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
    private invalidKnownIds: Set<string>

    constructor(state: ProcessState) {
        super()
        this.state = state
        this.invalidStartTags = new Set(['body', 'html', 'head', 'script', 'style', 'meta', 'strong']);
        this.invalidRootTags = new Set(['p', 'span', 'h2', 'h3', 'h4']);
        this.invalidKnownIds = new Set(['react-root', 'app', 'ng-app'])
    }

    public execute(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.state.result.length === 0) resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const node = this.state.result[i];
                if (!utility.isHTMLElement(node)) {
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
        if (this.invalidKnownIds.has(topLevelParentNode.id)) return false
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
                if (utility.isHTMLElement(node)) this.parseCookieBanner(node, index)
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
                if (utility.isCookieBanner(current) && this.isAboModel(current.root)) {
                    this.state.removeResultAtIndex(i--)
                    if (this.state.result.length === 0) {
                        utility.createToast('Abonnement Banner')
                        RESULT_HANDLER?.sendResults()
                        SESSION_STORAGE.set('AEC', 'done')
                    }
                }
            }
            resolve()
        })
    }

    private isAboModel(root: HTMLElement) {
        const aboModelKeywords = ['mit werbung', 'with advertising', "mit tracking"]
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
                if (!utility.isCookieBanner(current)) continue
                const hasKnownActionElement = this.handleKnownIdentifiers(current)
                if (!hasKnownActionElement) this.getActionNodes(current)
                if (!this.hasActionElements(current)) {
                    this.state.removeResultAtIndex(i--)
                }
            }
            resolve()
        })
    }

    private handleKnownIdentifiers(banner: CookieBanner): boolean {
        for (const selector of Object.values(KNOWN_IDENTIFIERS).flat()) {
            const result = banner.root.querySelector(selector) as HTMLElement | null
            if (!result) continue
            const key =
                this.isLink(result) ? 'links'
                : this.isButton(result) ? 'buttons'
                : this.isDiv(result) ? 'divs'
                : null
            if (!key) {
                console.log('UNKNOWN ACTION ELEMENT: ', result)
                continue
            }
            banner.actionElements[key] = [result]
            banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root) as HTMLInputElement[]
            return true
        }
        return false
    }

    private isLink(element: HTMLElement): boolean {
        return element.tagName === 'A'
    }

    private isButton(element: HTMLElement): boolean {
        return element.tagName === 'BUTTON'
    }

    private isDiv(element: HTMLElement): boolean {
        return element.tagName === 'DIV'
    }

    private getActionNodes(banner: CookieBanner): void {
        banner.actionElements['buttons'] = this.getButtons(banner.root)
        banner.actionElements['checkboxes'] = this.getCheckboxes(banner.root) as HTMLInputElement[]
        banner.actionElements['links'] = this.getLinks(banner.root)
        banner.actionElements['divs'] = this.getDivs(banner.root) as HTMLElement[]
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

    private getDivs(root: HTMLElement) {
        return Array.from(root.querySelectorAll('div[aria-label*="ablehnen"]'))
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
                if (!utility.isCookieBanner(current)) continue
                const result = this.findMatchingKeywords(current)
                result ? this.createBannerAction(current, result) : this.state.removeResultAtIndex(i--)
            }
            this.state.setBannerInProgress(this.state.result.length)
            resolve()
        })
    }

    private findMatchingKeywords(banner: CookieBanner) {
        const actionNodesList: HTMLElement[][] = [banner.actionElements.buttons, banner.actionElements.links, banner.actionElements.divs]
        for (const keywords of this.keywordLists) {
            for (const actionNodes of actionNodesList) {
                if (actionNodes.length === 0) continue
                const match = this.getFirstMatch(actionNodes, keywords)
                if (match && !this.actionAlreadyExecuted(match) && !this.isFooterContent(match)) {
                    const result = new ActionClassifyResult(match, keywords.type)
                    this.checkMultipleKeywordsMatch(result)
                    return result
                }
            }
        }
        return null
    }

    private isFooterContent(node: HTMLElement): boolean {
        const footer = document.querySelector('footer')
        return footer ? footer.contains(node) : false
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

    private checkMultipleKeywordsMatch(result: ActionClassifyResult): void {
        if (result.actionType === CookieBannerActionType.DENY) {
            const keywords = SettingsKeywordMatcher
            const multipleMatch = this.getFirstMatch(result.node, keywords)
            if (multipleMatch) result.updateActionType(keywords.type)
        }
    }

    private createBannerAction(banner: CookieBanner, result: ActionClassifyResult): void {
        const action = new CookieBannerAction(result.node, result.actionType)
        this.state.clickedElements.push(result.node)
        banner.actions.push(action)
        // this.hideCookieBanner(banner)
    }

    // private hideCookieBanner(banner: CookieBanner) {
    //     banner.root.style.opacity = '0'
    // }
}

class ExecuteAction extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>(async (resolve) => {
            if (this.state.result.length === 0) resolve()
            for (const result of this.state.result) {
                if (utility.isCookieBanner(result)) {
                    this.unselectCheckboxes(result.actionElements.checkboxes as HTMLInputElement[])
                    await this.executeAction(result)
                }
            }
            resolve()
        })
    }

    private async executeAction(banner: CookieBanner) {
        const nextAction = banner.actions.shift()
        if (nextAction) {
            banner.completed = await nextAction.execute()
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

    public execute(): Promise<void> {
        return new Promise<void>(async (resolve) => {
            this.handleNoResult() ? resolve() : this.handleResult()
            if (!this.state.addedCommands && this.state.bannersInProgress > 0) {
                this.addSubsequentCommands()
                // wait for DOM to update after click
                await utility.timeout(500)
            }
            resolve()
        })
    }

    private handleNoResult() {
        if (this.state.result.length === 0 && this.state.bannersInProgress === -1) {
            SESSION_STORAGE.set('AEC', 'done')
            this.state.printTime()
            return true
        }
        else if (this.state.result.length === 0) return true
        return false
    }

    private handleResult() {
        const completedBanners = this.state.result
            .filter(banner => utility.isCookieBanner(banner) && banner.completed)
        this.state.bannersInProgress -= completedBanners.length
        if (this.state.bannersInProgress === 0) {
            SESSION_STORAGE.set('AEC', 'done')
            this.state.printTime()
            utility.createToast()
        }
    }

    private addSubsequentCommands() {
        this.state.result.filter(banner => utility.isCookieBanner(banner) && !banner.completed)
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
                // const start = performance.now()
                await command.execute()
                // utility.colorTrace(`[${command.constructor.name}] executed in ${(performance.now() - start).toFixed(2)}ms`, "lightgreen")
                // console.dir([...this.state.result])
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

    public addCommand(sequence: Command[], initialResult: StateResult) {
        const queueItem = new CommandQueueItem(sequence, initialResult)
        this.commands.push(queueItem)
    }

    public getNext() {
        return this.commands.shift() || null
    }

    public hasNext(): boolean {
        return this.commands.length > 0

    }
}


export {
    CommandSequenceProvider,
    CommandExecutor,
    CommandQueue
}