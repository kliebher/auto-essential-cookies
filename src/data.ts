const COOKIE_QUERY = 'span, p, h3, h2, h4, aside, [id*="policy"], [id*="consent"], [id*="message-container"]' +
    '[id*="cookie"], [aria-label*="policy"], [aria-label*="consent"], [aria-label*="cookie"], [class*="message-container"]'

const KEYWORDS = {
    'DENY': [
        "ablehnen",
        "alle ablehnen",
        "reject",
        "decline",
        "refuse",
        "notwendig",
        "auswahl",
        "deny",
        "weigern"
    ],

    'SETTINGS': [
        "settings",
        "einstellungen",
        "customize",
        "individuell",
        "purpose",
        "zweck"
    ],

    'CONFIRM': [
        "essenziell",
        "essential",
        "confirm my choices",
        "confirm choices",
        "save", "speichern",
        "selected",
        "ausgewählt"
    ],
}

const KNOWN_IDENTIFIERS = {
    'DENY': [
        "#gdpr-banner-decline",
        "#bannerDeclineButton",
        "#onetrust-reject-all-handler",
        "#didomi-notice-disagree-button",
        "[i*='cmp-deny-btn']",
        "#CybotCookiebotDialogBodyButtonDecline",
        ".sp-cc-rejectall-link",
        ".uc-deny-button",
        ".sp_choice_type_REJECT_ALL",
        ".cmpboxbtnno",
        ".cmptxt_btn_no",
        ".osano-cm-button--type_denyAll",
        ".dialog-actions-decline-btn",
        ".ot-pc-refuse-all-handler",
        ".osano-cm-button--type_denyAll",
        "[aria-label='Reject All']",
        "[data-hook='ccsu-banner-decline-all']",
        "[testid='dialog-decline-button']"
    ],

    'SETTINGS': [
        "#onetrust-pc-btn-handler",
        "#didomi-notice-learn-more-button",
        "#didomi-notice-do-not-sell-button",
        "#truste-show-consent",
        ".cmpmorelink",
        ".cmptxt_btn_custom",
        "[data-testid='uc-customize-anchor']",
        "[data-testid='uc-more-button']",
    ],

    'CONFIRM': [
        "#cmpbntsavetxt",
        "#wt-cli-privacy-save-btn",
        "#onetrust-pc-btn-handler",
        "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection",
        "#save-and-close-btn",
        ".onetrust-close-btn-handler",
        ".cmpboxbtnsave",
        ".cmpboxbtnyescustomchoices",
        ".cmptxt_btn_save",
        ".save-preference-btn-handler",
        ".osano-cm-save",
        "[data-testid='uc-save-button']",
        "[aria-label='Save choices']"
    ]
}

export { COOKIE_QUERY, KEYWORDS, KNOWN_IDENTIFIERS }