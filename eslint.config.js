const nodePlugin = require('eslint-plugin-node');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = {
    languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'script',
    },
    plugins: {
        node: nodePlugin,
        prettier: prettierPlugin,
    },
    rules: {
        ...prettierConfig.rules,
        'no-unused-vars': 'warn',
        semi: ['error', 'always'],
        quotes: ['error', 'single'],
        indent: ['error', 4],
        'no-console': 'off',
        'no-debugger': 'warn',
        'comma-dangle': ['error', 'always-multiline'],
        'arrow-spacing': ['error', { before: true, after: true }],
    },
};
