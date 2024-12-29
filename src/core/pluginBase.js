// File: src/core/pluginBase.js

const Logger = require('../utils/logger');

/**
 * Base class for LLM-Pack plugins providing lifecycle hooks for the processing pipeline.
 * All plugins should extend this class to ensure consistent behavior and interface.
 */
class PluginBase {
	constructor() {
		this.name = this.constructor.name;
		this.isInitialized = false;
	}

	/**
	 * Initializes the plugin. This method should be overridden by plugins that need
	 * to perform setup operations.
	 * @returns {Promise<void>}
	 */
	async init() {
		if (this.isInitialized) {
			Logger.warn(`Plugin ${this.name} is already initialized`);
			return;
		}

		try {
			await this._doInit();
			this.isInitialized = true;
			Logger.info(`Plugin ${this.name} initialized successfully`);
		} catch (error) {
			Logger.error(`Failed to initialize plugin ${this.name}:`, error);
			throw error;
		}
	}

	/**
	 * Protected method for plugin-specific initialization.
	 * @protected
	 */
	async _doInit() {
		// Optional initialization logic to be implemented by derived classes
	}

	/**
	 * Called before the file scanning process begins.
	 * @param {Object} options - Scanning options passed to the file scanner
	 * @returns {Promise<void>}
	 */
	async beforeScan(options) {
		this._validateInitialized('beforeScan');
		try {
			await this._beforeScan(options);
			Logger.debug(`Plugin ${this.name}: beforeScan completed`);
		} catch (error) {
			Logger.error(`Plugin ${this.name}: beforeScan error:`, error);
			throw error;
		}
	}

	/**
	 * Called after metadata enrichment is complete.
	 * @param {Array<Object>} enrichedFiles - Files with enriched metadata
	 * @returns {Promise<void>}
	 */
	async afterEnrich(enrichedFiles) {
		this._validateInitialized('afterEnrich');
		try {
			await this._afterEnrich(enrichedFiles);
			Logger.debug(`Plugin ${this.name}: afterEnrich completed`);
		} catch (error) {
			Logger.error(`Plugin ${this.name}: afterEnrich error:`, error);
			throw error;
		}
	}

	/**
	 * Protected methods for plugin-specific implementations.
	 * These methods should be overridden by derived classes as needed.
	 * @protected
	 */
	async _beforeScan(options) {}
	async _afterEnrich(enrichedFiles) {}

	/**
	 * Validates that the plugin is initialized before executing hooks.
	 * @param {string} methodName - Name of the hook method being called
	 * @private
	 */
	_validateInitialized(methodName) {
		if (!this.isInitialized) {
			const error = new Error(
				`Cannot execute ${methodName}: Plugin ${this.name} is not initialized`,
			);
			Logger.error(error.message);
			throw error;
		}
	}

	/**
	 * Safely destroys plugin resources.
	 * Override this method to clean up any resources used by the plugin.
	 * @returns {Promise<void>}
	 */
	async destroy() {
		try {
			await this._doDestroy();
			this.isInitialized = false;
			Logger.info(`Plugin ${this.name} destroyed successfully`);
		} catch (error) {
			Logger.error(`Failed to destroy plugin ${this.name}:`, error);
			throw error;
		}
	}

	/**
	 * Protected method for plugin-specific cleanup.
	 * @protected
	 */
	async _doDestroy() {
		// Optional cleanup logic to be implemented by derived classes
	}
}

module.exports = PluginBase;
