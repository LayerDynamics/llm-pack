module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays Prettier errors as ESLint errors
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['tests/integrationTestProjectCompact/largeFile.js', 'docs/build/'], // Top-level ignore patterns
  rules: {
    'no-console': ['error', { allow: ['log', 'warn', 'error', 'clear'] }], // Disallows console statements except log, warn, error, clear
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warns on unused variables except those prefixed with _
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
        tabWidth: 2,
        semi: true,
        printWidth: 100,
      },
    ], // Custom Prettier rules
  },
};
