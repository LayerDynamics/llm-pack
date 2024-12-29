// src/core/pluginManager.js

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger');

class PluginManager {
	constructor(pluginsDir) {
		this.pluginsDir = pluginsDir;
		this.plugins = [];
	}

	async loadPlugins() {
		this.plugins = [];

		if (!this.pluginsDir) {
			Logger.error('Plugins directory not set');
			return;
		}

		Logger.info(`Loading plugins from: ${this.pluginsDir}`);

		let entries;
		try {
			entries = await fs.readdir(this.pluginsDir);
		} catch (error) {
			Logger.error('Failed to read plugins directory', error);
			return;
		}

		if (!entries || entries.length === 0) {
			Logger.info('No plugins found in directory');
			return;
		}

		for (const entryName of entries) {
			const pluginPath = path.join(this.pluginsDir, entryName);

			let stats;
			try {
				stats = await fs.stat(pluginPath);
			} catch (statErr) {
				Logger.error(`Failed to stat path ${pluginPath}`, statErr);
				continue;
			}

			if (!stats.isDirectory()) {
				continue;
			}

			try {
				const manifestPath = path.join(pluginPath, 'plugin.json');
				let manifestData;
				try {
					manifestData = await fs.readFile(manifestPath, 'utf8');
				} catch (readErr) {
					Logger.error(`Failed to load plugin at ${pluginPath}`, readErr);
					continue;
				}

				let manifest;
				try {
					manifest = JSON.parse(manifestData);
				} catch (parseError) {
					Logger.error(`Failed to load plugin at ${pluginPath}`, parseError);
					continue;
				}

				if (!this.validateManifest(manifest)) {
					Logger.warn(
						`Skipping plugin at ${pluginPath} due to invalid manifest.`,
					);
					continue;
				}

				const entryPath = path.join(pluginPath, manifest.entry);

				let Plugin;
				try {
					Plugin = require(entryPath);
				} catch (requireError) {
					Logger.error(
						`Failed to require entry file for plugin ${manifest.name} at ${entryPath}`,
						requireError,
					);
					continue;
				}

				let instance;
				try {
					instance = new Plugin();
				} catch (constructorError) {
					Logger.error(
						`Failed to instantiate plugin ${manifest.name}`,
						constructorError,
					);
					continue;
				}

				if (!this.validateInstance(instance, manifest.name)) {
					Logger.warn(
						`Plugin instance validation failed for ${manifest.name}.`,
					);
					continue;
				}

				try {
					await instance.init();
					this.plugins.push({ manifest, instance });
					Logger.info(`Loaded plugin: ${manifest.name} v${manifest.version}`);
				} catch (initError) {
					Logger.error(
						`Failed to initialize plugin ${manifest.name}`,
						initError,
					);
				}
			} catch (error) {
				Logger.error(`Failed to load plugin at ${pluginPath}`, error);
			}
		}
	}

	validateManifest(manifest) {
		if (!manifest || typeof manifest !== 'object') {
			Logger.warn('Invalid manifest: not an object');
			return false;
		}

		const required = ['name', 'version', 'entry'];
		const missing = required.filter((field) => !manifest[field]);

		if (missing.length > 0) {
			Logger.warn(`Invalid manifest: missing fields: ${missing.join(', ')}`);
			return false;
		}

		if (typeof manifest.entry !== 'string' || manifest.entry.trim() === '') {
			Logger.warn('Invalid manifest: "entry" must be a non-empty string');
			return false;
		}

		return true;
	}

	validateInstance(instance, pluginName = 'UnknownPlugin') {
		if (!instance || typeof instance !== 'object') {
			Logger.warn('Invalid plugin instance: null or not an object');
			return false;
		}

		const requiredHooks = ['init', 'afterEnrich'];
		const missingHooks = requiredHooks.filter(
			(hook) => typeof instance[hook] !== 'function',
		);

		if (missingHooks.length > 0) {
			Logger.warn(
				`${pluginName}: Missing required hook methods: ${missingHooks.join(
					', ',
				)}`,
			);
			return false;
		}
		return true;
	}

	async executeHook(hookName, ...args) {
		if (!hookName || typeof hookName !== 'string') {
			Logger.error('Invalid hook name provided');
			return;
		}

		Logger.info(`Executing hook '${hookName}' for all plugins.`);
		for (const plugin of this.plugins) {
			if (typeof plugin.instance[hookName] === 'function') {
				try {
					await plugin.instance[hookName](...args);
					Logger.info(
						`Successfully executed hook '${hookName}' for plugin '${plugin.manifest.name}'.`,
					);
				} catch (error) {
					Logger.error(
						`Error in plugin hook '${hookName}' for '${plugin.manifest.name}': ${error.message}`,
						error,
					);
				}
			} else {
				Logger.warn(
					`Plugin '${plugin.manifest.name}' does not implement hook '${hookName}'.`,
				);
			}
		}
	}
}

module.exports = PluginManager;
