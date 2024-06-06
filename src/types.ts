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
    private readonly _element: HTMLElement
    private readonly type: CookieBannerActionType

    constructor(element: HTMLElement, type: CookieBannerActionType) {
        this._element = element;
        this.type = type;
    }

    execute() {
        return new Promise<void>(async (resolve) => {
            if (TESTING) {
                RESULT_HANDLER?.addXpath(this.element)
                if (this.isBannerCompleted()) await RESULT_HANDLER?.sendResults()
            }
            this.element.click()
            resolve()
        })
    }

    isBannerCompleted() {
        return this.type !== CookieBannerActionType.SETTINGS
    }

    get element() {
        return this._element
    }
}


export {
    CookieBanner,
    CookieBannerAction,
    CookieBannerActionType,
    ActionClassifyResult,
    StateResult
}