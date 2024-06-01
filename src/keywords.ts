import { CookieBannerActionType } from "./types";
import { KEYWORDS } from "./data";


export interface KeywordMatcher {
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

export class DenyKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.DENY

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.DENY;
    }
}

export class SettingsKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.SETTINGS

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.SETTINGS;
    }
}

export class ConfirmKeywords extends AbstractKeywordMatcher {
    private readonly _keywords: Array<string> = KEYWORDS.CONFIRM

    get keywords(): Array<string> {
        return this._keywords;
    }

    get type(): CookieBannerActionType {
        return CookieBannerActionType.CONFIRM;
    }
}