module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/tests/gui/setup.js',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/gui/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    testEnvironmentOptions: {
        customExportConditions: [''],
        url: 'http://localhost',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@testing-library|react-dom)/)',
    ],
    testMatch: ['**/tests/gui/**/*.test.js'],
    transform: {
        '^.+\\.jsx?$': ['babel-jest', { configFile: './babel.config.js' }]
    },
};
