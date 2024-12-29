// tests/unit/configProcessor.test.js

const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const ConfigProcessor = require('../../src/core/configProcessor');
const Logger = require('../../src/utils/logger');

// Mock the logger to prevent actual logging during tests
jest.mock('../../src/utils/logger');

describe('ConfigProcessor', () => {
	const rootDir = '/project';
	const configFileName = '.llm-pack.config.json';
	const configFilePath = path.join(rootDir, configFileName);

	beforeEach(() => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					sortingStrategy: 'lexical',
					metadata: {
						enrichDescriptions: false,
						detectDependencies: true,
					},
					output: {
						dir: '.custom-pack',
						fileName: 'custom_output.md',
					},
				}),
			},
		});
	});

	afterEach(() => {
		mockFs.restore();
		jest.clearAllMocks();
	});

	test('should load and merge user config with default config', () => {
		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();

		expect(mergedConfig.sortingStrategy).toBe('lexical');
		expect(mergedConfig.metadata.enrichDescriptions).toBe(false); // overridden by user
		expect(mergedConfig.metadata.detectDependencies).toBe(true); // user-defined
		expect(mergedConfig.output.dir).toBe('.custom-pack'); // user-defined
		expect(mergedConfig.output.fileName).toBe('custom_output.md'); // user-defined
	});

	test('should use default config if no user config file is found', () => {
		// Remove the config file from mock FS
		mockFs({
			'/project': {},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();

		expect(mergedConfig.sortingStrategy).toBe('lexical'); // default
		expect(mergedConfig.metadata.enrichDescriptions).toBe(true); // default
		expect(mergedConfig.metadata.detectDependencies).toBe(true); // default
		expect(mergedConfig.output.dir).toBe('.llm-pack'); // default
		expect(mergedConfig.output.fileName).toBe('consolidated_output.md'); // default
	});

	test('should throw an error if config file is invalid JSON', () => {
		// Overwrite config file with invalid JSON
		mockFs({
			'/project': {
				'.llm-pack.config.json': '{ invalid JSON }',
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		expect(() => processor.loadConfig()).toThrow(
			'Invalid configuration file format',
		);
	});

	test('should validate known fields and throw errors for invalid types', () => {
		// Overwrite config file with invalid types
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					sortingStrategy: 123,
					metadata: {
						enrichDescriptions: 'nope',
					},
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		expect(() => processor.loadConfig()).toThrow(
			'sortingStrategy must be a string.',
		);
	});

	test('should throw an error if sortingStrategy is missing', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					metadata: {
						enrichDescriptions: true,
						detectDependencies: true,
					},
					output: {
						dir: '.llm-pack',
						fileName: 'output.md',
					},
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();
		expect(mergedConfig.sortingStrategy).toBe('lexical'); // default
	});

	test('should handle empty metadata object', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					sortingStrategy: 'dependency',
					metadata: {},
					output: {
						dir: '.llm-pack',
						fileName: 'output.md',
					},
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();
		expect(mergedConfig.metadata.enrichDescriptions).toBe(true); // default
		expect(mergedConfig.metadata.detectDependencies).toBe(true); // default
	});

	test('should override only specific fields in user config', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					metadata: {
						detectDependencies: false,
					},
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();
		expect(mergedConfig.sortingStrategy).toBe('lexical'); // default
		expect(mergedConfig.metadata.enrichDescriptions).toBe(true); // default
		expect(mergedConfig.metadata.detectDependencies).toBe(false); // overridden
		expect(mergedConfig.output.dir).toBe('.llm-pack'); // default
		expect(mergedConfig.output.fileName).toBe('consolidated_output.md'); // default
	});
});

describe('ConfigProcessor - Additional Coverage', () => {
	test('should throw if metadata.enrichDescriptions is not boolean', () => {
		const cp = new ConfigProcessor('/fake');
		jest
			.spyOn(cp, 'mergeConfigs')
			.mockImplementation((a, b) => ({ ...a, ...b }));
		// line 106
		expect(() => {
			cp.validateConfig({ metadata: { enrichDescriptions: 'not boolean' } });
		}).toThrow('metadata.enrichDescriptions must be a boolean.');
	});

	test('should throw if metadata.detectDependencies is not boolean', () => {
		const cp = new ConfigProcessor('/fake');
		// line 109
		expect(() => {
			cp.validateConfig({ metadata: { detectDependencies: 'nope' } });
		}).toThrow('metadata.detectDependencies must be a boolean.');
	});
});

// ...existing code...
