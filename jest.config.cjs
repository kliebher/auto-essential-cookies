module.exports = {
    transformIgnorePatterns: [
        "node_modules/"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "^.+\\.config\\.(js|json)$"
    ],
    testRegex: "(/__tests__/.*|(\\\\.|/)(test\\.cjs))",
};
