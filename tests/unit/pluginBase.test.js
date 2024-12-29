// File: tests/unit/pluginBase.test.js

const PluginBase = require('../../src/core/pluginBase');
const Logger = require('../../src/utils/logger');

// Mock the Logger
jest.mock('../../src/utils/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
}));

describe('PluginBase', () => {
	let plugin;

	beforeEach(() => {
		// Create a derived plugin for testing
		class TestPlugin extends PluginBase {
			constructor() {
				super();
				this._doInit = jest.fn().mockResolvedValue();
				this._beforeScan = jest.fn().mockResolvedValue();
				this._afterEnrich = jest.fn().mockResolvedValue();
				this._doDestroy = jest.fn().mockResolvedValue();
			}
		}

		plugin = new TestPlugin();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should initialize correctly', async () => {
		await plugin.init();

		expect(plugin.isInitialized).toBe(true);
		expect(plugin._doInit).toHaveBeenCalled();
		expect(Logger.info).toHaveBeenCalledWith(
			`Plugin ${plugin.name} initialized successfully`,
		);
	});

	test('should not initialize if already initialized', async () => {
		plugin.isInitialized = true;
		await plugin.init();

		expect(Logger.warn).toHaveBeenCalledWith(
			`Plugin ${plugin.name} is already initialized`,
		);
		expect(plugin._doInit).not.toHaveBeenCalled();
	});

	test('should handle errors during initialization', async () => {
		plugin._doInit.mockRejectedValue(new Error('Init failed'));

		await expect(plugin.init()).rejects.toThrow('Init failed');

		expect(Logger.error).toHaveBeenCalledWith(
			`Failed to initialize plugin ${plugin.name}:`,
			expect.any(Error),
		);
		expect(plugin.isInitialized).toBe(false);
	});

	test('should execute beforeScan successfully', async () => {
		plugin.isInitialized = true;
		const options = { someOption: true };

		await plugin.beforeScan(options);

		expect(plugin._beforeScan).toHaveBeenCalledWith(options);
		expect(Logger.debug).toHaveBeenCalledWith(
			`Plugin ${plugin.name}: beforeScan completed`,
		);
	});

	test('should throw error if beforeScan called before init', async () => {
		await expect(plugin.beforeScan({})).rejects.toThrow(
			`Cannot execute beforeScan: Plugin ${plugin.name} is not initialized`,
		);

		expect(Logger.error).toHaveBeenCalledWith(
			`Cannot execute beforeScan: Plugin ${plugin.name} is not initialized`,
		);
		expect(plugin._beforeScan).not.toHaveBeenCalled();
	});

	test('should handle errors during beforeScan', async () => {
		plugin.isInitialized = true;
		plugin._beforeScan.mockRejectedValue(new Error('beforeScan failed'));

		await expect(plugin.beforeScan({})).rejects.toThrow('beforeScan failed');

		expect(Logger.error).toHaveBeenCalledWith(
			`Plugin ${plugin.name}: beforeScan error:`,
			expect.any(Error),
		);
	});

	test('should execute afterEnrich successfully', async () => {
		plugin.isInitialized = true;
		const enrichedFiles = [{ file: 'test.js' }];

		await plugin.afterEnrich(enrichedFiles);

		expect(plugin._afterEnrich).toHaveBeenCalledWith(enrichedFiles);
		expect(Logger.debug).toHaveBeenCalledWith(
			`Plugin ${plugin.name}: afterEnrich completed`,
		);
	});

	test('should throw error if afterEnrich called before init', async () => {
		await expect(plugin.afterEnrich([])).rejects.toThrow(
			`Cannot execute afterEnrich: Plugin ${plugin.name} is not initialized`,
		);

		expect(Logger.error).toHaveBeenCalledWith(
			`Cannot execute afterEnrich: Plugin ${plugin.name} is not initialized`,
		);
		expect(plugin._afterEnrich).not.toHaveBeenCalled();
	});

	test('should handle errors during afterEnrich', async () => {
		plugin.isInitialized = true;
		plugin._afterEnrich.mockRejectedValue(new Error('afterEnrich failed'));

		await expect(plugin.afterEnrich([])).rejects.toThrow('afterEnrich failed');

		expect(Logger.error).toHaveBeenCalledWith(
			`Plugin ${plugin.name}: afterEnrich error:`,
			expect.any(Error),
		);
	});

	test('should destroy correctly', async () => {
		plugin.isInitialized = true;

		await plugin.destroy();

		expect(plugin._doDestroy).toHaveBeenCalled();
		expect(plugin.isInitialized).toBe(false);
		expect(Logger.info).toHaveBeenCalledWith(
			`Plugin ${plugin.name} destroyed successfully`,
		);
	});

	test('should handle errors during destroy', async () => {
		plugin.isInitialized = true;
		plugin._doDestroy.mockRejectedValue(new Error('Destroy failed'));

		await expect(plugin.destroy()).rejects.toThrow('Destroy failed');

		expect(Logger.error).toHaveBeenCalledWith(
			`Failed to destroy plugin ${plugin.name}:`,
			expect.any(Error),
		);
		expect(plugin.isInitialized).toBe(true);
	});
});
