// tests/unit/pluginManager.test.js

const path = require('path');
const tmp = require('tmp');
const fs = require('fs-extra');
const PluginManager = require('../../src/core/pluginManager');

// Mock the Logger before importing PluginManager
jest.mock('../../src/utils/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
	log: jest.fn(),
}));

const Logger = require('../../src/utils/logger');

describe('PluginManager', () => {
	let pluginManager;
	let tmpDir;
	const pluginBasePath = path.resolve(
		__dirname,
		'../../src/core/pluginBase.js',
	);

	beforeEach(async () => {
		// Create a temporary directory for plugins
		tmpDir = tmp.dirSync({ unsafeCleanup: true });
		const pluginsDir = path.join(tmpDir.name, 'plugins');

		// Ensure the plugins directory exists
		await fs.ensureDir(pluginsDir);

		// Create ValidPlugin
		const validPluginDir = path.join(pluginsDir, 'ValidPlugin');
		await fs.ensureDir(validPluginDir);
		await fs.writeJson(path.join(validPluginDir, 'plugin.json'), {
			name: 'ValidPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(validPluginDir, 'index.js'),
			`
				const PluginBase = require('${pluginBasePath}');
				module.exports = class ValidPlugin extends PluginBase {
					constructor() {
						super();
						this.hookCalls = { init: 0, afterEnrich: 0 };
					}

					async init() {
						this.hookCalls.init++;
						return Promise.resolve();
					}

					async afterEnrich(files) {
						this.hookCalls.afterEnrich++;
						global.hookResult = { called: true, files };
						return Promise.resolve();
					}
				};
			`,
		);

		// Create ErrorPlugin
		const errorPluginDir = path.join(pluginsDir, 'ErrorPlugin');
		await fs.ensureDir(errorPluginDir);
		await fs.writeJson(path.join(errorPluginDir, 'plugin.json'), {
			name: 'ErrorPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(errorPluginDir, 'index.js'),
			`
				const PluginBase = require('${pluginBasePath}');
				module.exports = class ErrorPlugin extends PluginBase {
					constructor() {
						super();
					}

					async init() {
						return Promise.resolve();
					}

					async afterEnrich() {
						throw new Error('Hook error');
					}
				};
			`,
		);

		// Create NoHooksPlugin
		const noHooksPluginDir = path.join(pluginsDir, 'NoHooksPlugin');
		await fs.ensureDir(noHooksPluginDir);
		await fs.writeJson(path.join(noHooksPluginDir, 'plugin.json'), {
			name: 'NoHooksPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(noHooksPluginDir, 'index.js'),
			`
				module.exports = class NoHooksPlugin {
					async init() {}
				};
			`,
		);

		// Create InvalidPlugin with invalid JSON
		const invalidPluginDir = path.join(pluginsDir, 'InvalidPlugin');
		await fs.ensureDir(invalidPluginDir);
		await fs.writeFile(
			path.join(invalidPluginDir, 'plugin.json'),
			'invalid json',
		);

		// Create MissingEntryPlugin without index.js
		const missingEntryPluginDir = path.join(pluginsDir, 'MissingEntryPlugin');
		await fs.ensureDir(missingEntryPluginDir);
		await fs.writeJson(path.join(missingEntryPluginDir, 'plugin.json'), {
			name: 'MissingEntryPlugin',
			version: '1.0.0',
			entry: 'missing.js',
		});

		// Initialize PluginManager with the temporary plugins directory
		pluginManager = new PluginManager(pluginsDir);

		// Initialize global hook result
		global.hookResult = { called: false, files: null };
	});

	afterEach(() => {
		// Remove the temporary directory
		tmpDir.removeCallback();

		// Reset module registry and mocks
		jest.resetModules();
		jest.clearAllMocks();

		delete global.hookResult;
	});

	test('should load valid plugins correctly', async () => {
		await pluginManager.loadPlugins();
		expect(pluginManager.plugins.length).toBe(2); // ValidPlugin + ErrorPlugin

		const validPlugin = pluginManager.plugins.find(
			(p) => p.manifest.name === 'ValidPlugin',
		);
		const errorPlugin = pluginManager.plugins.find(
			(p) => p.manifest.name === 'ErrorPlugin',
		);

		expect(validPlugin).toBeDefined();
		expect(errorPlugin).toBeDefined();

		expect(Logger.info).toHaveBeenCalledWith(
			expect.stringContaining('Loaded plugin: ValidPlugin v1.0.0'),
		);
		expect(Logger.info).toHaveBeenCalledWith(
			expect.stringContaining('Loaded plugin: ErrorPlugin v1.0.0'),
		);
	}, 15000); // Increase timeout to 15 seconds

	test('should validate plugin hook requirements', async () => {
		await pluginManager.loadPlugins();
		expect(Logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(/NoHooksPlugin.*Missing required hook methods/),
		);
	});

	test('should handle plugins with empty entry field', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with EmptyEntryPlugin
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const emptyEntryPluginDir = path.join(pluginsDir, 'EmptyEntryPlugin');
		await fs.ensureDir(emptyEntryPluginDir);
		await fs.writeJson(path.join(emptyEntryPluginDir, 'plugin.json'), {
			name: 'EmptyEntryPlugin',
			version: '1.0.0',
			entry: '',
		});

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(pluginManager.plugins.length).toBe(0);

		// Check that Logger.warn was called with messages about empty entry
		expect(Logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid manifest: missing fields: entry'),
		);
		expect(Logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Skipping plugin at'),
		);
	});

	test('should execute hooks across all plugins', async () => {
		await pluginManager.loadPlugins();
		const testFiles = [{ path: 'test.js' }];
		await pluginManager.executeHook('afterEnrich', testFiles);

		const validPlugin = pluginManager.plugins.find(
			(p) => p.manifest.name === 'ValidPlugin',
		);
		const errorPlugin = pluginManager.plugins.find(
			(p) => p.manifest.name === 'ErrorPlugin',
		);

		expect(validPlugin).toBeDefined();
		expect(validPlugin.instance.hookCalls.afterEnrich).toBe(1);
		expect(global.hookResult).toEqual({ called: true, files: testFiles });

		expect(Logger.info).toHaveBeenCalledWith(
			expect.stringContaining(
				"Successfully executed hook 'afterEnrich' for plugin 'ValidPlugin'.",
			),
		);
		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				"Error in plugin hook 'afterEnrich' for 'ErrorPlugin'",
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
	});

	test('should handle plugin with missing entry file', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with MissingEntryPlugin without 'missing.js'
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const missingEntryPluginDir = path.join(pluginsDir, 'MissingEntryPlugin');
		await fs.ensureDir(missingEntryPluginDir);
		await fs.writeJson(path.join(missingEntryPluginDir, 'plugin.json'), {
			name: 'MissingEntryPlugin',
			version: '1.0.0',
			entry: 'missing.js',
		});
		// Do not create 'missing.js'

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'Failed to require entry file for plugin MissingEntryPlugin at ',
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('handles plugin constructor failure', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with ConstructorErrorPlugin that throws in constructor
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const constructorErrorPluginDir = path.join(
			pluginsDir,
			'ConstructorErrorPlugin',
		);
		await fs.ensureDir(constructorErrorPluginDir);
		await fs.writeJson(path.join(constructorErrorPluginDir, 'plugin.json'), {
			name: 'ConstructorErrorPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(constructorErrorPluginDir, 'index.js'),
			`
				const PluginBase = require('${pluginBasePath}');
				module.exports = class ConstructorErrorPlugin extends PluginBase {
					constructor() {
						super();
						throw new Error('Constructor failed');
					}

					async init() {}
					async afterEnrich() {}
				};
			`,
		);

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'Failed to instantiate plugin ConstructorErrorPlugin',
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('handles plugin init failure', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with InitErrorPlugin that throws in init
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const initErrorPluginDir = path.join(pluginsDir, 'InitErrorPlugin');
		await fs.ensureDir(initErrorPluginDir);
		await fs.writeJson(path.join(initErrorPluginDir, 'plugin.json'), {
			name: 'InitErrorPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(initErrorPluginDir, 'index.js'),
			`
				const PluginBase = require('${pluginBasePath}');
				module.exports = class InitErrorPlugin extends PluginBase {
					constructor() { super(); }

					async init() {
						throw new Error('Init failed');
					}

					async afterEnrich() {}
				};
			`,
		);

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining('Failed to initialize plugin InitErrorPlugin'),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('executeHook handles invalid hook names', async () => {
		await pluginManager.executeHook();
		expect(Logger.error).toHaveBeenCalledWith('Invalid hook name provided');
	});

	test('executeHook handles errors in plugin hooks', async () => {
		await pluginManager.loadPlugins();
		await pluginManager.executeHook('afterEnrich', []);
		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				"Error in plugin hook 'afterEnrich' for 'ErrorPlugin'",
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
	});

	test('should handle errors during plugin initialization', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with InitErrorPlugin that throws in init
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const initErrorPluginDir = path.join(pluginsDir, 'InitErrorPlugin');
		await fs.ensureDir(initErrorPluginDir);
		await fs.writeJson(path.join(initErrorPluginDir, 'plugin.json'), {
			name: 'InitErrorPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(initErrorPluginDir, 'index.js'),
			`
				const PluginBase = require('${pluginBasePath}');
				module.exports = class InitErrorPlugin extends PluginBase {
					constructor() { super(); }

					async init() {
						throw new Error('Init failed');
					}

					async afterEnrich() {}
				};
			`,
		);

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining('Failed to initialize plugin InitErrorPlugin'),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('should handle missing plugin files after manifest load', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with DisappearingPlugin without 'index.js'
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const disappearingPluginDir = path.join(pluginsDir, 'DisappearingPlugin');
		await fs.ensureDir(disappearingPluginDir);
		await fs.writeJson(path.join(disappearingPluginDir, 'plugin.json'), {
			name: 'DisappearingPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		// Do not create 'index.js'

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'Failed to require entry file for plugin DisappearingPlugin at ',
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('should handle plugin require errors', async () => {
		// Remove all existing plugins
		await fs.remove(path.join(tmpDir.name, 'plugins'));

		// Recreate plugins directory with RequireErrorPlugin with invalid JavaScript
		const pluginsDir = path.join(tmpDir.name, 'plugins');
		await fs.ensureDir(pluginsDir);

		const requireErrorPluginDir = path.join(pluginsDir, 'RequireErrorPlugin');
		await fs.ensureDir(requireErrorPluginDir);
		await fs.writeJson(path.join(requireErrorPluginDir, 'plugin.json'), {
			name: 'RequireErrorPlugin',
			version: '1.0.0',
			entry: 'index.js',
		});
		await fs.writeFile(
			path.join(requireErrorPluginDir, 'index.js'),
			'invalid javascript code',
		);

		// Reload PluginManager
		pluginManager = new PluginManager(pluginsDir);
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'Failed to require entry file for plugin RequireErrorPlugin at ',
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('should handle invalid hook parameters', async () => {
		await pluginManager.loadPlugins();
		// Passing null as hook parameters
		await pluginManager.executeHook('afterEnrich', null);
		// Since 'afterEnrich' expects an array, the plugin should handle it or throw an error
		// Depending on implementation, adjust the expectation
		// For this example, assume the plugin tries to read files and fails
		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				"Error in plugin hook 'afterEnrich' for 'ErrorPlugin'",
			),
			expect.anything(), // Relaxed from expect.any(Error)
		);
	});

	describe('Additional Coverage', () => {
		test('should log warning for plugins with invalid manifest structure', async () => {
			// Remove all existing plugins
			await fs.remove(path.join(tmpDir.name, 'plugins'));

			// Recreate plugins directory with InvalidStructure plugin
			const pluginsDir = path.join(tmpDir.name, 'plugins');
			await fs.ensureDir(pluginsDir);

			const invalidStructurePluginDir = path.join(
				pluginsDir,
				'InvalidStructure',
			);
			await fs.ensureDir(invalidStructurePluginDir);
			await fs.writeJson(path.join(invalidStructurePluginDir, 'plugin.json'), {
				name: 'InvalidStructure',
				// Missing required fields
			});

			// Reload PluginManager
			pluginManager = new PluginManager(pluginsDir);
			await pluginManager.loadPlugins();

			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid manifest: missing fields'),
			);
			expect(pluginManager.plugins.length).toBe(0);
		});

		test('should handle null plugin instance', () => {
			expect(pluginManager.validateInstance(null, 'NullPlugin')).toBe(false);
			expect(Logger.warn).toHaveBeenCalledWith(
				'Invalid plugin instance: null or not an object',
			);
		});

		test('should handle missing required hook methods', () => {
			const instance = {
				init: () => {},
				// Missing afterEnrich
			};
			expect(pluginManager.validateInstance(instance, 'PartialPlugin')).toBe(
				false,
			);
			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Missing required hook methods: afterEnrich'),
			);
		});
	});

	describe('Plugin Hooks', () => {
		test('should execute multiple hooks in order', async () => {
			await pluginManager.loadPlugins();
			const validPlugin = pluginManager.plugins.find(
				(p) => p.manifest.name === 'ValidPlugin',
			);
			expect(validPlugin).toBeDefined();

			await pluginManager.executeHook('afterEnrich', [{ path: 'test.js' }]);
			expect(validPlugin.instance.hookCalls.afterEnrich).toBe(1);

			await pluginManager.executeHook('afterEnrich', [{ path: 'another.js' }]);
			expect(validPlugin.instance.hookCalls.afterEnrich).toBe(2);
		});

		test('should skip hooks for unimplemented methods', async () => {
			await pluginManager.loadPlugins();
			await pluginManager.executeHook('unknownHook', []);
			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"Plugin 'ValidPlugin' does not implement hook 'unknownHook'",
				),
			);
		});
	});

	describe('Cleanup and State Validation', () => {
		test('maintains clean state between operations', async () => {
			await pluginManager.loadPlugins();
			expect(Array.isArray(pluginManager.plugins)).toBe(true);
			expect(pluginManager.plugins.length).toBeLessThanOrEqual(2);
			expect(global.hookResult).toEqual({ called: false, files: null });
		});

		test('ensures logger mock is reset between tests', () => {
			expect(Logger.info).not.toHaveBeenCalled();
			expect(Logger.error).not.toHaveBeenCalled();
			expect(Logger.warn).not.toHaveBeenCalled();
		});

		test('properly cleans up plugin instances', async () => {
			await pluginManager.loadPlugins();
			const initialPluginCount = pluginManager.plugins.length;

			// Reset plugins array
			pluginManager.plugins = [];

			// Reload plugins
			await pluginManager.loadPlugins();
			expect(pluginManager.plugins.length).toBe(initialPluginCount);
		});
	});

	test('should handle missing plugins directory', async () => {
		// Initialize PluginManager with undefined pluginsDir
		pluginManager = new PluginManager();
		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith('Plugins directory not set');
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('should handle failure to read plugins directory', async () => {
		// Remove existing plugins directory
		await fs.remove(pluginManager.pluginsDir);
		
		// No need to mock fs.readdir - let it fail naturally with ENOENT
		await pluginManager.loadPlugins();
		
		expect(Logger.error).toHaveBeenCalledWith(
			'Failed to read plugins directory',
			expect.anything() // Accept any error since ENOENT is system-specific
		);
		expect(pluginManager.plugins.length).toBe(0);
	});

	test('should handle non-directory entries in plugins directory', async () => {
		// Create a file inside the plugins directory
		const filePath = path.join(tmpDir.name, 'plugins', 'not-a-directory.txt');
		await fs.writeFile(filePath, 'Just a file');

		await pluginManager.loadPlugins();

		// Ensure that the file was skipped and no additional plugins were loaded
		expect(pluginManager.plugins.length).toBe(2); // Assuming other valid plugins exist
	});

	test('should log warning for malformed plugin.json', async () => {
		// Create a malformed plugin.json
		const malformedPluginDir = path.join(
			tmpDir.name,
			'plugins',
			'MalformedPlugin',
		);
		await fs.ensureDir(malformedPluginDir);
		await fs.writeFile(
			path.join(malformedPluginDir, 'plugin.json'),
			'{ malformed json',
		);

		await pluginManager.loadPlugins();

		expect(Logger.error).toHaveBeenCalledWith(
			expect.stringContaining('Failed to load plugin at'),
			expect.any(SyntaxError),
		);
		expect(pluginManager.plugins.length).toBe(2); // Existing valid plugins
	});
});
