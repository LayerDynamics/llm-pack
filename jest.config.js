// jest.config.js
module.exports = {
	testEnvironment: 'node',
	roots: ['<rootDir>/src', '<rootDir>/tests'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1', // Correctly map @/ to src/
	},
	moduleDirectories: ['node_modules', 'src'],
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	testPathIgnorePatterns: ['/node_modules/'],
	transformIgnorePatterns: [
		'/node_modules/(?!((execa)|(node-fetch)|(chalk)|(electron)))',
	],
	transform: {
		'^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }],
	},
	moduleFileExtensions: ['js', 'json'],
	globals: {
		'process.env.BROWSERSLIST_IGNORE_OLD_DATA': true,
	},
	testEnvironmentOptions: {
		url: 'http://localhost',
	},
	verbose: true,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
	injectGlobals: true,
};
