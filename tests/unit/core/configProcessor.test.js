//  tests/unit/core/configProcessor.test.js

const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const ConfigProcessor = require('../../../src/core/configProcessor');
const Logger = require('../../../src/utils/logger');

// Mock the logger to prevent actual logging during tests
jest.mock('../../../src/utils/logger');

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

	test('should override multiple nested configuration fields', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					sortingStrategy: 'dependency',
					metadata: {
						enrichDescriptions: false,
						detectDependencies: false,
					},
					output: {
						dir: './dist',
						fileName: 'output.md',
					},
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		const mergedConfig = processor.loadConfig();

		expect(mergedConfig.sortingStrategy).toBe('dependency');
		expect(mergedConfig.metadata.enrichDescriptions).toBe(false);
		expect(mergedConfig.metadata.detectDependencies).toBe(false);
		expect(mergedConfig.output.dir).toBe('./dist');
		expect(mergedConfig.output.fileName).toBe('output.md');
	});

	test('should handle invalid output directory type', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					output: { dir: true },
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		expect(() => processor.loadConfig()).toThrow('output.dir must be a string');
	});

	test('should handle invalid output fileName type', () => {
		mockFs({
			'/project': {
				'.llm-pack.config.json': JSON.stringify({
					output: { fileName: true },
				}),
			},
		});

		const processor = new ConfigProcessor(rootDir, configFileName);
		expect(() => processor.loadConfig()).toThrow(
			'output.fileName must be a string',
		);
	});
});

// ...existing code...
