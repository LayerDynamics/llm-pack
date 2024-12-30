// jest.config.js
module.exports = {
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/tests/setup.js'],
	moduleNameMapper: {
		'^@/components/(.*)$': '<rootDir>/src/gui/components/$1',
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
		'^electron$': '<rootDir>/tests/mocks/electron.js',
		'^events$': '<rootDir>/tests/mocks/events.js',
	},
	testPathIgnorePatterns: ['/node_modules/'],
	transform: {
		'^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.js' }],
	},
	verbose: true,
	collectCoverage: true,
	coverageReporters: ['text', 'lcov'],
	coverageThreshold: {
		global: {
			branches: 75,
			functions: 75,
			lines: 75,
			statements: 75,
		},
	},
};
