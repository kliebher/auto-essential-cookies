import { TESTING, RESULT_HANDLER } from "./config";

enum CookieBannerActionType {
    DENY = 'DENY',
    SETTINGS = 'SETTINGS',
    CONFIRM = 'CONFIRM'
}

type StateResult = Array<HTMLElement | CookieBanner>


class ActionClassifyResult {
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
    private readonly element: HTMLElement
    private readonly type: CookieBannerActionType

    constructor(element: HTMLElement, type: CookieBannerActionType) {
        this.element = element;
        this.type = type;
    }

    async execute() {
        if (TESTING) {
            RESULT_HANDLER?.addXpath(this.element)
            if (this.isBannerCompleted()) await RESULT_HANDLER?.sendResults()
        }
        this.element.click()
        return this.isBannerCompleted()
    }

    private isBannerCompleted() {
        return this.type !== CookieBannerActionType.SETTINGS
    }
}


export {
    CookieBanner,
    CookieBannerAction,
    CookieBannerActionType,
    ActionClassifyResult,
    StateResult
}