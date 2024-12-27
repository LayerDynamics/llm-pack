// ...existing code...

/**
 * ConfigProcessor
 * Parses and validates user-defined configurations in .llm-pack.config.json.
 */

const fs = require('fs');
const path = require('path');

const Logger = require('../utils/logger');

class ConfigProcessor {
  /**
   * Creates an instance of ConfigProcessor.
   * @param {string} rootDir - The project root directory.
   * @param {string} configFileName - The name of the config file (default is .llm-pack.config.json).
   */
  constructor(rootDir, configFileName = '.llm-pack.config.json') {
    this.rootDir = rootDir;
    this.configFilePath = path.join(rootDir, configFileName);
    this.defaultConfig = {
      sortingStrategy: 'lexical', // could be 'lexical', 'custom', etc.
      metadata: {
        enrichDescriptions: true,
        detectDependencies: true,
      },
      output: {
        dir: '.llm-pack',
        fileName: 'consolidated_output.md',
      },
      // Additional default settings can be added here
    };
    this.userConfig = {};
  }

  /**
   * Loads and merges user configurations with default configurations.
   * @returns {Object} - Merged configuration object.
   */
  loadConfig() {
    this.userConfig = {};

    if (fs.existsSync(this.configFilePath)) {
      Logger.info(`Loading user config from ${this.configFilePath}`);
      let parsedData;

      try {
        const rawData = fs.readFileSync(this.configFilePath, 'utf8');
        parsedData = JSON.parse(rawData);
      } catch (error) {
        Logger.error(`Error parsing config file: ${error.message}`);
        throw new Error('Invalid configuration file format. Please ensure it is valid JSON.');
      }

      // Validate configuration outside the try-catch to allow validation errors to propagate
      this.userConfig = this.validateConfig(parsedData);
    } else {
      Logger.info(`No user config found at ${this.configFilePath}. Using default configurations.`);
    }

    const mergedConfig = this.mergeConfigs(this.defaultConfig, this.userConfig);
    Logger.info('Configuration loaded successfully.');
    return mergedConfig;
  }

  /**
   * Merges two configuration objects (defaultConfig and userConfig).
   * @param {Object} defaultConfig - The default configuration.
   * @param {Object} userConfig - The user-defined configuration.
   * @returns {Object} - Merged configuration object.
   */
  mergeConfigs(defaultConfig, userConfig) {
    // Simple deep merge to combine nested objects
    const merged = { ...defaultConfig };

    Object.keys(userConfig).forEach((key) => {
      if (
        merged[key] &&
        typeof merged[key] === 'object' &&
        !Array.isArray(merged[key]) &&
        typeof userConfig[key] === 'object' &&
        !Array.isArray(userConfig[key])
      ) {
        merged[key] = this.mergeConfigs(merged[key], userConfig[key]);
      } else {
        merged[key] = userConfig[key];
      }
    });

    return merged;
  }

  /**
   * Validates the user configuration object for known fields and types.
   * @param {Object} config - Raw user configuration object.
   * @returns {Object} - Validated configuration object.
   */
  validateConfig(config) {
    // Example validations. Extend as needed.
    if (config.sortingStrategy && typeof config.sortingStrategy !== 'string') {
      throw new Error('sortingStrategy must be a string.');
    }
    if (config.metadata) {
      if (config.metadata.enrichDescriptions !== undefined && typeof config.metadata.enrichDescriptions !== 'boolean') {
        throw new Error('metadata.enrichDescriptions must be a boolean.');
      }
      if (config.metadata.detectDependencies !== undefined && typeof config.metadata.detectDependencies !== 'boolean') {
        throw new Error('metadata.detectDependencies must be a boolean.');
      }
    }
    if (config.output) {
      if (config.output.dir && typeof config.output.dir !== 'string') {
        throw new Error('output.dir must be a string.');
      }
      if (config.output.fileName && typeof config.output.fileName !== 'string') {
        throw new Error('output.fileName must be a string.');
      }
    }
    return config;
  }
}

module.exports = ConfigProcessor;

// ...existing code...
