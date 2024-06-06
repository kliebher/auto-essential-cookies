import { type ProcessState } from './process'
import { BASIC_KEYWORDS, RESULT_HANDLER, SETTINGS_KEYWORDS, SettingsKeywordMatcher, UPDATE_TIMEOUT } from "./config";
import * as util from "./utility";
import { type KeywordMatcher } from "./keywords";
import { ABONNEMENT_KEYWORDS, COOKIE_QUERY } from "./data";
import { AKnownIdentifierMatcher, KNOWN_IDENTIFIER_MATCHER } from "./known_identifier";
import { ActionClassifyResult, CookieBanner, CookieBannerAction, CookieBannerActionType, type StateResult} from "./types";

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
            const knownRootExists = this.findKnownRoots()
            if(!knownRootExists) this.findNodes()
            resolve()
        })
    }

    private findKnownRoots() {
        for (const matcher of KNOWN_IDENTIFIER_MATCHER) {
            const root = matcher.findRoot()
            if (root && !this.state.processedRoots.includes(root)) {
                this.state.result.push(root)
                this.state.foundKnownMatcher.set(root, matcher)
                return true
            }
        }
        return false
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
        return nodeInnerText.includes('cookies')
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
            if (this.state.result.length === 0) return resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const node = this.state.result[i];
                if (!util.isHTMLElement(node)) {
                    continue
                }
                const topLevelParentNode = this.identifyTopLevelParentNode(node);
                if (topLevelParentNode && this.isValidRoot(node, topLevelParentNode)) {
                    this.state.result[i] = topLevelParentNode;
                    continue
                }
                this.state.removeResultByIndex(i--)

            }
            this.checkForChild()
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

    private checkForChild() {
        if (this.state.result.length <= 1) return
        for (let i = 0; i < this.state.result.length; i++) {
            for (let ii = 1; ii < this.state.result.length; ii++) {
                const a = this.state.result[i]
                const b = this.state.result[ii]
                if (!util.isHTMLElement(a) || !util.isHTMLElement(b)) continue
                if (a.contains(b)) this.state.removeResultByIndex(ii)
            }
        }
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
            if (this.state.result.length === 0) return resolve()
            this.state.result.forEach((node, index) => {
                if (util.isHTMLElement(node)) this.parseCookieBanner(node, index)
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
        return new Promise<void>(async (resolve) => {
            if (this.state.result.length === 0) return resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (!util.isCookieBanner(current)) continue
                if (this.isAboModel(current.root)) {
                    this.state.removeResultByIndex(i--)
                    if (this.state.result.length === 0) {
                        await RESULT_HANDLER?.sendResults()
                        this.state.finishProcess(true, 'Abo Model')
                        return
                    }
                }
                else if (this.state.foundKnownMatcher.get(current.root) !== undefined) {
                    current.root.style.opacity = '0'
                }
            }
            resolve()
        })
    }

    private isAboModel(root: HTMLElement) {
        const aboModelKeywords = ABONNEMENT_KEYWORDS
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
            if (this.state.result.length === 0) return resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (!util.isCookieBanner(current)) continue
                const hasKnownActions = this.findKnownActions(current)
                if (hasKnownActions) {
                    current.actionElements['checkboxes'] = this.getElementsByQuery(current.root, 'input[type=checkbox]')
                } else this.getActionNodes(current)
                if (!this.hasActionElements(current)) {
                    this.state.removeResultByIndex(i--)
                }
            }
            resolve()
        })
    }

    private findKnownActions(banner: CookieBanner): boolean {
        const matcher = this.state.foundKnownMatcher.get(banner.root)
        const isKnownRoot = matcher !== undefined
        if (!isKnownRoot || !matcher) return false
        const {
            DENY,
            CONFIRM,
            SETTINGS
        } = CookieBannerActionType

        const hasDenyAction = this.findKnownAction(banner, matcher, 'findDeny', DENY)
        if (hasDenyAction) return true

        const hasConfirmAction = this.findKnownAction(banner, matcher, 'findConfirm', CONFIRM)
        if (hasConfirmAction) return true

        if (this.state.basicSearch) {
            const hasSettingsAction = this.findKnownAction(banner, matcher, 'findSettings', SETTINGS)
            if (hasSettingsAction) return true
        }
        return false
    }

    findKnownAction(banner: CookieBanner, matcher: AKnownIdentifierMatcher, funcName: string, type: CookieBannerActionType) {
        // @ts-ignore
        const actionElement = matcher[funcName](banner)
        if (actionElement && !this.state.clickedElements.includes(actionElement)) {
            banner.actionElements[this.getKeyByElement(actionElement)] = [actionElement]
            this.state.foundKnownAction.set(actionElement, type)
            return true
        }
        return false
    }

    private getKeyByElement(element: HTMLElement): string {
        const tag = element.tagName.toLowerCase()
        return tag === 'a'
            ? 'links'
            : tag === 'button'
                ? 'buttons'
                : 'uncommon'
    }

    private getActionNodes(banner: CookieBanner): void {
        const root = banner.root
        banner.actionElements['buttons'] = this.getElementsByQuery(root, 'button')
        banner.actionElements['checkboxes'] = this.getElementsByQuery(root, 'input[type=checkbox]')
        banner.actionElements['links'] = this.getElementsByQuery(root, 'a')
        banner.actionElements['uncommon'] = this.getElementsByQuery(root, '[aria-label*="ablehnen"')
    }

    private getElementsByQuery(root: HTMLElement, query: string): HTMLElement[] {
        return Array.from(root.querySelectorAll(query)) as HTMLElement[]
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
            if (this.state.result.length === 0) return resolve()
            for (let i = 0; i < this.state.result.length; i++) {
                const current = this.state.result[i]
                if (!util.isCookieBanner(current)) continue
                let result = this.handleKnownActions(current)
                if (!result) {
                    result = this.findMatchingKeywords(current)
                }
                result ? this.createBannerAction(current, result) : this.state.removeResultByIndex(i--)
            }
            this.state.setBannerInProgress(this.state.result.length)
            resolve()
        })
    }

    private handleKnownActions(banner: CookieBanner) {
        const actionNodes = Object.values(banner.actionElements).flat()
        for (const actionNode of actionNodes) {
            const knownActionType = this.state.foundKnownAction.get(actionNode)
            if (knownActionType !== undefined && !this.state.clickedElements.includes(actionNode)) {
                return new ActionClassifyResult(actionNode, knownActionType)
            }
        }
        return null
    }

    private findMatchingKeywords(banner: CookieBanner): ActionClassifyResult | null {
        const actionNodesList: HTMLElement[][] = [banner.actionElements.buttons, banner.actionElements.links, banner.actionElements.uncommon]
        for (const keywords of this.keywordLists) {
            for (const actionNodes of actionNodesList) {
                if (!actionNodes || actionNodes.length === 0) continue
                const match = this.getFirstMatch(actionNodes, keywords)
                if (!this.isValidMatch(match, keywords.type)) continue
                return new ActionClassifyResult(match!, keywords.type)
            }
        }
        return null
    }

    private isValidMatch(match: HTMLElement | null, type: CookieBannerActionType): boolean {
        if (!match) return false
        if (match.hasAttribute('type') && match.getAttribute('type') === 'submit') return false
        console.log(match)
        if (this.isFooterContent(match)) return false
        if (this.actionAlreadyExecuted(match)) return false
        return !this.isFalsePositive(match, type);
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

    private isFalsePositive(match: HTMLElement, matchedKeywordType: CookieBannerActionType) {
        // checks if a button text combines settings and deny -> leads to second banner layer
        if (matchedKeywordType === CookieBannerActionType.DENY) {
            const multipleMatch = this.getFirstMatch(match, SettingsKeywordMatcher)
            if (multipleMatch) return true
        }
        return false
    }

    private createBannerAction(banner: CookieBanner, result: ActionClassifyResult): void {
        const action = new CookieBannerAction(result.node, result.actionType)
        banner.actions.push(action)
    }
}

class ExecuteAction extends Command {
    public state: ProcessState

    constructor(state: ProcessState) {
        super()
        this.state = state
    }

    public execute(): Promise<void> {
        return new Promise<void>(async (resolve) => {
            if (this.state.result.length === 0) return resolve()
            for (const result of this.state.result) {
                if (util.isCookieBanner(result)) {
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
            await nextAction.execute()
            banner.completed = nextAction.isBannerCompleted()
            banner.executedActions.push(nextAction)
            this.state.clickedElements.push(nextAction.element)
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
            const processDone = this.handleNoResult()
            if (processDone) resolve()

            this.handleResult()

            if (!this.state.addedCommands) {
                this.addSubsequentCommands()
                // wait for DOM to update after click
                await util.timeout(UPDATE_TIMEOUT)
            }

            this.handleFailedSameRootSearch()
            resolve()
        })
    }

    private handleNoResult() {
        if (!this.hasResults() && !this.foundBanner()) {
            this.state.finishProcess(false)
            return true
        }
        else return this.state.result.length === 0;
    }

    private foundBanner() {
        return this.state.bannersInProgress !== -1
    }

    private hasResults() {
        return this.state.result.length > 0
    }

    private handleResult() {
        const completedBanners = this.getResult(true)
        this.state.bannersInProgress -= completedBanners.length
        if (this.state.bannersInProgress === 0) {
            this.state.finishProcess(true, 'Cookies Managed!')
        }
    }

    private getResult(completed: boolean) {
        return this.state.result.filter((banner) => {
            return util.isCookieBanner(banner) && banner.completed === completed
        })
    }

    private addSubsequentCommands() {
        const notCompleted = this.getResult(false)

        notCompleted.forEach(bannerInProgress => {
            this.state.addCommandSequence(true, true, [bannerInProgress])
        })

        this.state.addCommandSequence(false, true)
        this.state.addedCommands = true
    }

    private handleFailedSameRootSearch() {
        if (this.state.sameRootSearch && this.state.currentSameRoot) {
            this.state.processedRoots.push(this.state.currentSameRoot)
        }
    }
}


class CommandSequenceProvider {
    constructor() {}

    static get(state: ProcessState, sameRoot: boolean = false, settings: boolean = false) {
        const sequence = sameRoot ? this.COMMAND_SEQUENCE_SAME_ROOT : this.COMMAND_SEQUENCE_FULL_DOM
        const keywords: Array<KeywordMatcher> = settings ? SETTINGS_KEYWORDS : BASIC_KEYWORDS
        return sequence(state, keywords)
    }

    static COMMAND_SEQUENCE_FULL_DOM = (state: ProcessState, keywords: KeywordMatcher[]) => {
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

    static COMMAND_SEQUENCE_SAME_ROOT = (state: ProcessState, keywords: KeywordMatcher[]) => {
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
            this.updateState(next)
            for (const command of next.sequence) {
                const start = performance.now()
                await command.execute()
                util.colorTrace(`[${command.constructor.name}](${window.location.host}) executed in ${(performance.now() - start).toFixed(2)}ms`, "lightgreen")
                console.dir([...this.state.result])
            }
        }
    }

    private updateState(next: CommandQueueItem) {
        this.state.result = next.initialResult
        this.state.sameRootSearch = next.sameRoot
        this.state.basicSearch = !next.settings
        if (this.state.sameRootSearch && util.isCookieBanner(next.initialResult[0])) {
            this.state.currentSameRoot = next.initialResult[0].root
        }
    }
}

class CommandQueueItem {
    public readonly sequence: Command[]
    public readonly initialResult: StateResult
    public readonly sameRoot: boolean
    public readonly settings: boolean

    constructor(sequence: Command[], startingPoint: StateResult, sameRoot: boolean, settings: boolean) {
        this.sequence = sequence
        this.initialResult = startingPoint
        this.sameRoot = sameRoot
        this.settings = settings
    }
}

class CommandQueue {
    private commands: CommandQueueItem[]

    constructor() {
        this.commands = []
    }

    public addCommand(sequence: Command[], initialResult: StateResult, sameRoot: boolean, settings: boolean) {
        const queueItem = new CommandQueueItem(sequence, initialResult, sameRoot, settings)
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
    CommandQueue,
    Command
}