const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,

    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script"
        },
        rules: {
        }
    }
];