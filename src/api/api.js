// ...existing code...

const path = require('path'); // Ensure path is imported
const PluginManager = require('../core/pluginManager'); // Load PluginManager
const fs = require('fs'); // Add this import

/**
 * LLM-Pack API
 * Exposes programmatic access to core functionalities: scanning, metadata enrichment, sorting, and consolidation.
 */

const FileScanner = require('../core/fileScanner');
const MetadataProcessor = require('../core/metadataProcessor');
const Sorter = require('../core/sorter');

const LexicalSort = require('../core/strategies/lexicalSort');
const SizeSort = require('../core/strategies/sizeSort');
const TypeSort = require('../core/strategies/typeSort');
const Consolidator = require('../core/consolidator');
const ConfigProcessor = require('../core/configProcessor');
const Logger = require('../utils/logger');

class LlmPackAPI {
	/**
	 * @param {string} rootDir - The root directory of the project/dataset.
	 * @param {Object} config - Optional configuration object to override or extend defaults.
	 */
	constructor(rootDir, config = {}) {
		this.rootDir = rootDir;
		this.configOverride = config;
		this.pluginManager = new PluginManager(); // Initialize PluginManager
		this.loadConfiguration();
	}

	/**
	 * Loads configuration using ConfigProcessor, merging any override config.
	 */
	loadConfiguration() {
		const configProcessor = new ConfigProcessor(this.rootDir);
		const baseConfig = configProcessor.loadConfig();

		// Merge config override (passed via constructor) with loaded config
		this.config = { ...baseConfig, ...this.configOverride };

		Logger.info('API configuration loaded:', this.config);
	}

	/**
	 * Initialize plugins.
	 */
	async initializePlugins() {
		await this.pluginManager.loadPlugins();
	}

	/**
	 * Scans the project folder to gather all non-ignored files.
	 * @returns {Promise<Array<string>>} - A promise that resolves to an array of file paths.
	 */
	async scanFiles() {
		await this.pluginManager.executeHook('beforeScan', []);
		const scanner = new FileScanner(this.rootDir);
		const files = await scanner.scan();
		return files;
	}

	/**
	 * Enriches each file with metadata such as descriptions, dependencies, etc.
	 * @param {Array<string>} files - An array of file paths.
	 * @returns {Promise<Array<Object>>} - An array of enriched file objects.
	 */
	async enrichMetadata(files) {
		const metadataProcessor = new MetadataProcessor(this.rootDir);
		const enrichedFiles = await metadataProcessor.enrich(files);
		await this.pluginManager.executeHook('afterEnrich', enrichedFiles);
		return enrichedFiles;
	}

	/**
	 * Sorts the enriched files based on the configured sorting strategy.
	 * @param {Array<Object>} enrichedFiles - An array of enriched file objects.
	 * @returns {Array<Object>} - A sorted array of enriched file objects.
	 */
	async sortFiles(enrichedFiles) {
		await this.pluginManager.executeHook('beforeSort', enrichedFiles);
		let sortingStrategyInstance;

		// For demonstration, only 'lexical' is provided. Additional strategies can be implemented.
		switch ((this.config.sortingStrategy || '').toLowerCase()) {
			case 'size':
				sortingStrategyInstance = new SizeSort({
					order: this.config.sortOrder || 'asc',
				});
				break;
			case 'type':
				sortingStrategyInstance = new TypeSort({
					order: this.config.sortOrder || 'asc',
				});
				break;
			case 'lexical':
			default:
				sortingStrategyInstance = new LexicalSort();
				break;
		}

		const sorter = new Sorter(sortingStrategyInstance);
		const sortedFiles = await sorter.sort(enrichedFiles);
		await this.pluginManager.executeHook('afterSort', sortedFiles);
		return sortedFiles;
	}

	/**
	 * Consolidates the sorted files into a single Markdown document.
	 * @param {Array<Object>} sortedFiles - An array of sorted file objects.
	 * @returns {Promise<void>}
	 */
	async consolidateFiles(sortedFiles) {
		await this.pluginManager.executeHook('beforeConsolidate', sortedFiles);
		const { dir, fileName } = this.config.output;

		// Handle files without content
		const filesWithContent = await Promise.all(
			sortedFiles.map(async (file) => {
				if (!file.content && file.path) {
					try {
						file.content = await fs.promises.readFile(file.path, 'utf8');
					} catch (error) {
						Logger.error(`Failed to read file content: ${file.path}`, error);
						file.content = ''; // Provide empty content as fallback
					}
				}
				return file;
			}),
		);

		const resolvedDir = path.join(this.rootDir, dir);
		const consolidator = new Consolidator(resolvedDir, fileName);
		await consolidator.consolidate(filesWithContent);
		await this.pluginManager.executeHook(
			'afterConsolidate',
			consolidator.outputFilePath,
		);
	}

	/**
	 * High-level method to run the entire process: scan, enrich, sort, and consolidate.
	 * @returns {Promise<void>}
	 */
	async runAll() {
		Logger.info('Starting LLM-Pack full process...');
		await this.initializePlugins();
		const files = await this.scanFiles();
		const enriched = await this.enrichMetadata(files);
		const sorted = await this.sortFiles(enriched);
		await this.consolidateFiles(sorted);
		Logger.info('LLM-Pack full process completed.');
	}
}

module.exports = LlmPackAPI;

// ...existing code...
