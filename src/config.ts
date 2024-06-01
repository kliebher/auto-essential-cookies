import { TestResultHandler } from './testing'
import { DenyKeywords, SettingsKeywords, ConfirmKeywords, type KeywordMatcher} from "./keywords";
import { SessionStorageHandler } from "./utility";


const DenyKeywordMatcher = new DenyKeywords()
const SettingsKeywordMatcher = new SettingsKeywords()
const ConfirmKeywordMatcher = new ConfirmKeywords()

const INITIAL_TAB_KEYWORDS: Array<KeywordMatcher> = [
    DenyKeywordMatcher,
    SettingsKeywordMatcher,
    ConfirmKeywordMatcher
]

const SETTINGS_TAB_KEYWORDS: Array<KeywordMatcher> = [
    DenyKeywordMatcher,
    ConfirmKeywordMatcher
]

const TESTING = true
const LOADING_TIMEOUT: number = 500 //ms
const SESSION_STORAGE = new SessionStorageHandler()
const RESULT_HANDLER = TESTING ? new TestResultHandler() : null


export {
    TESTING,
    LOADING_TIMEOUT,
    SESSION_STORAGE,
    RESULT_HANDLER,
    INITIAL_TAB_KEYWORDS,
    SETTINGS_TAB_KEYWORDS,
    DenyKeywordMatcher,
    SettingsKeywordMatcher,
    ConfirmKeywordMatcher
}