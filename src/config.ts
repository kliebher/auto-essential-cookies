import { TestResultHandler } from './testing'
import { DenyKeywords, SettingsKeywords, ConfirmKeywords, type KeywordMatcher} from "./keywords";
import { SessionStorageHandler } from "./utility";


const DenyKeywordMatcher = new DenyKeywords()
const SettingsKeywordMatcher = new SettingsKeywords()
const ConfirmKeywordMatcher = new ConfirmKeywords()

const BASIC_KEYWORDS: Array<KeywordMatcher> = [
    DenyKeywordMatcher,
    ConfirmKeywordMatcher,
    SettingsKeywordMatcher,
]

const SETTINGS_KEYWORDS: Array<KeywordMatcher> = [
    DenyKeywordMatcher,
    ConfirmKeywordMatcher
]

const TESTING = false

const UPDATE_TIMEOUT: number = 300 //ms
const INITIAL_TIMEOUT: number = 300

const SESSION_STORAGE = new SessionStorageHandler()
const RESULT_HANDLER = TESTING ? new TestResultHandler() : null


export {
    TESTING,
    INITIAL_TIMEOUT,
    UPDATE_TIMEOUT,
    SESSION_STORAGE,
    RESULT_HANDLER,
    BASIC_KEYWORDS,
    SETTINGS_KEYWORDS,
    DenyKeywordMatcher,
    SettingsKeywordMatcher,
    ConfirmKeywordMatcher
}