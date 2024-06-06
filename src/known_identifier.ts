import { type CookieBanner } from "./types";

interface IKnownIdentifierMatcher {
    root: string
    deny: string
    settings: string
    confirm: string
    findMatch(query: string): HTMLElement | null
    findRoot(): HTMLElement | null
    findDeny(banner: CookieBanner): HTMLElement | null
    findSettings(banner: CookieBanner): HTMLElement | null
    findConfirm(banner: CookieBanner): HTMLElement | null
}

abstract class AKnownIdentifierMatcher implements IKnownIdentifierMatcher {
    abstract root: string;
    abstract deny: string;
    abstract settings: string;
    abstract confirm: string;

    findMatch(query: string, banner?: CookieBanner): HTMLElement | null {
        const root = banner ? banner.root : document
        const result = root.querySelector(query)
        return result ? result as HTMLElement : null
    }

    findRoot(): HTMLElement | null {
        return this.findMatch(this.root)
    }

    findDeny(banner: CookieBanner) : HTMLElement | null {
        return this.findMatch(this.deny, banner)
    }

    findSettings(banner: CookieBanner) : HTMLElement | null {
        return this.findMatch(this.settings, banner)
    }

    findConfirm(banner: CookieBanner) : HTMLElement | null {
        return this.findMatch(this.confirm, banner)
    }
}


class CookieManagementProvider extends AKnownIdentifierMatcher {
    readonly root: string = '#cmpbox, #cmpboxWelcomeGDPR';
    readonly deny: string = '.cmpboxbtnno, .cmptxt_btn_no';
    readonly settings: string = '.cmpmorelink, .cmptxt_btn_custom';
    readonly confirm: string = '.cmpboxbtnsave, .cmptxt_btn_save';
}

class GDPR extends AKnownIdentifierMatcher {
    readonly root: string = '#gdpr-banner, #gdprCookieBanner';
    readonly deny: string = '#gdpr-banner-decline, #bannerDeclineButton';
    readonly settings: string = '.gdpr-banner-moreInfo, #manageCookiesLink';
    readonly confirm: string = '#submitCookiesBtn';
}

class OneTrust extends AKnownIdentifierMatcher {
    readonly root: string = '#onetrust-banner-sdk';
    readonly deny: string = '#onetrust-reject-all-handler, .ot-pc-refuse-all-handler';
    readonly settings: string = '#onetrust-pc-btn-handler';
    readonly confirm: string = '.save-preference-btn-handler, .onetrust-close-btn-handler';
}

class Didomi extends AKnownIdentifierMatcher {
    readonly root: string = '#didomi-notice, #didomi-popup';
    readonly deny: string = '#didomi-notice-disagree-button, #didomi-radio-option-disagree-to-all';
    readonly settings: string = '#didomi-notice-learn-more-button';
    readonly confirm: string = '[aria-label*=Save]';
}

class UserCentrics extends AKnownIdentifierMatcher {
    readonly root: string = '#uc-main-dialog, #uc-center-container';
    readonly deny: string = '.uc-deny-button, .uc-deny-all';
    readonly settings: string = '[data-testid="uc-customize-anchor"]';
    readonly confirm: string = '.uc-save-button';
}

class CookieBot extends AKnownIdentifierMatcher {
    readonly root: string = "#CybotCookiebotDialog"
    readonly deny: string = "#CybotCookiebotDialogBodyButtonDecline"
    readonly confirm: string = "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection"
    readonly settings: string = ""
}

class Osano extends AKnownIdentifierMatcher {
    readonly root: string = '.osano-cm-dialog, [aria-label="Cookie Consent Banner"]';
    readonly deny: string = '.osano-cm-denyAll, .osano-cm-button--type_denyAll';
    readonly settings: string = '.osano-cm-link--type_manage';
    readonly confirm: string = '.osano-cm-save, .osano-cm-button--type_save';
}

class SourcePoint extends AKnownIdentifierMatcher {
    readonly root: string = '[aria-label="privacy manager"], .message-container';
    readonly deny: string = '.sp_choice_type_REJECT_ALL, [aria-label*="Alle ablehnen"]';
    readonly settings: string = '.sp_choice_type_12, [aria-label*="Einstellungen"]';
    readonly confirm: string = '.sp_choice_type_SAVE_AND_EXIT, [aria-label*="speichern"]';
}

class Ketch extends AKnownIdentifierMatcher {
    readonly root: string = "#ketch-banner"
    readonly deny: string = "[aria-label='Reject All'], [aria-label*='Do not Sell or Share']"
    readonly confirm: string = "[aria-label='Save choices']"
    readonly settings: string = "[aria-label='Choose Cookies']"
}

// const KNOWN_IDENTIFIERS = {
//     'DENY': [
//         "#gdpr-banner-decline",
//         "#bannerDeclineButton",
//         "#onetrust-reject-all-handler",
//         "#didomi-notice-disagree-button",
//         "[i*='cmp-deny-btn']",
//         "#CybotCookiebotDialogBodyButtonDecline",
//         ".sp-cc-rejectall-link",
//         ".uc-deny-button",
//         ".sp_choice_type_REJECT_ALL",
//         ".cmpboxbtnno",
//         ".cmptxt_btn_no",
//         ".osano-cm-button--type_denyAll",
//         ".dialog-actions-decline-btn",
//         ".ot-pc-refuse-all-handler",
//         ".osano-cm-button--type_denyAll",
//         "[aria-label='Reject All']",
//         "[data-hook='ccsu-banner-decline-all']",
//         "[testid='dialog-decline-button']"
//     ],
//
//     'SETTINGS': [
//         "#onetrust-pc-btn-handler",
//         "#didomi-notice-learn-more-button",
//         "#didomi-notice-do-not-sell-button",
//         "#truste-show-consent",
//         ".cmptxt_btn_custom",
//         "[data-testid='uc-customize-anchor']",
//         "[data-testid='uc-more-button']",
//     ],
//
//     'CONFIRM': [
//         "#cmpbntsavetxt",
//         "#wt-cli-privacy-save-btn",
//         "#onetrust-pc-btn-handler",
//         "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection",
//         "#save-and-close-btn",
//         ".onetrust-close-btn-handler",
//         ".cmpboxbtnsave",
//         ".cmpboxbtnyescustomchoices",
//         ".cmptxt_btn_save",
//         ".save-preference-btn-handler",
//         ".osano-cm-save",
//         "[data-testid='uc-save-button']",
//         "[aria-label='Save choices']"
//     ]
// }



const KNOWN_IDENTIFIER_MATCHER: IKnownIdentifierMatcher[] = [
    new CookieManagementProvider(),
    new GDPR(),
    new OneTrust(),
    new Didomi(),
    new UserCentrics(),
    new CookieBot(),
    new Osano(),
    new SourcePoint(),
    new Ketch()
]


export {
    KNOWN_IDENTIFIER_MATCHER,
    AKnownIdentifierMatcher
}