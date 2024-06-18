const COOKIE_QUERY: string = 'span, p, h3, h2, h4, aside, a, [id*="policy"], [id*="consent"], [id*="message-container"], [id*="cookie"], [aria-label*="policy"], [aria-label*="consent"], [aria-label*="cookie"], [id*="cmp"], [bundlename*="cookie"]'

const ACTION_KEYWORDS: {[key: string]: string[]} = {
    'DENY': [
        "ablehnen",
        "reject",
        "decline",
        "refuse",
        "notwendig",
        "deny",
        "weigern",
        "neccessary only",
        "only essential"
    ],

    'SETTINGS': [
        "settings",
        "einstellungen",
        "customize",
        "individuell",
        "purpose",
        "zweck "
    ],

    'CONFIRM': [
        "essenziell", "essential",
        "confirm my choices",
        "confirm choices",
        "confirm",
        "save", "speichern",
        "selected",
        "ausgewählt",
        "weiter zu",
        "use selection",
        "auswahl",
        "bestätigen"
    ],
}

const ABONNEMENT_KEYWORDS = [
    'mit werbung',
    'with advertising',
    "mit tracking",
    "ohne Werbetracking",
    "werbefrei",
    "Werbefrei",
    "werbefreies"
]


export {
    COOKIE_QUERY,
    ACTION_KEYWORDS,
    ABONNEMENT_KEYWORDS
}

