// ...existing code...

const path = require('path'); // Ensure path is imported

/**
 * LLM-Pack API
 * Exposes programmatic access to core functionalities: scanning, metadata enrichment, sorting, and consolidation.
 */

const FileScanner = require('../core/fileScanner');
const MetadataProcessor = require('../core/metadataProcessor');
const Sorter = require('../core/sorter');

const LexicalSort = require('../core/strategies/lexicalSort');
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
   * Scans the project folder to gather all non-ignored files.
   * @returns {Promise<Array<string>>} - A promise that resolves to an array of file paths.
   */
  async scanFiles() {
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
    return enrichedFiles;
  }

  /**
   * Sorts the enriched files based on the configured sorting strategy.
   * @param {Array<Object>} enrichedFiles - An array of enriched file objects.
   * @returns {Array<Object>} - A sorted array of enriched file objects.
   */
  sortFiles(enrichedFiles) {
    let sortingStrategyInstance;

    // For demonstration, only 'lexical' is provided. Additional strategies can be implemented.
    switch (this.config.sortingStrategy) {
      case 'lexical':
      default:
        sortingStrategyInstance = new LexicalSort();
        break;
    }

    const sorter = new Sorter(sortingStrategyInstance);
    return sorter.sort(enrichedFiles);
  }

  /**
   * Consolidates the sorted files into a single Markdown document.
   * @param {Array<Object>} sortedFiles - An array of sorted file objects.
   * @returns {Promise<void>}
   */
  async consolidateFiles(sortedFiles) {
    const { dir, fileName } = this.config.output;
    const resolvedDir = path.join(this.rootDir, dir); // Resolve dir relative to rootDir
    const consolidator = new Consolidator(resolvedDir, fileName);
    await consolidator.consolidate(sortedFiles);
  }

  /**
   * High-level method to run the entire process: scan, enrich, sort, and consolidate.
   * @returns {Promise<void>}
   */
  async runAll() {
    Logger.info('Starting LLM-Pack full process...');
    const files = await this.scanFiles();
    const enriched = await this.enrichMetadata(files);
    const sorted = this.sortFiles(enriched);
    await this.consolidateFiles(sorted);
    Logger.info('LLM-Pack full process completed.');
  }
}

module.exports = LlmPackAPI;

// ...existing code...

