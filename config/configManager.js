const fs = require('fs').promises;
const yaml = require('js-yaml');

/**
 * Manages the application's configuration settings by loading, validating, and merging
 * default and user-provided configurations.
 *
 * @class ConfigManager
 * @param {string|null} [configPath=null] - Path to the configuration file. If null, the default configuration is used.
 */
class ConfigManager {
  constructor(configPath = null) {
    this.defaultConfig = {
      output: {
        format: 'markdown',
        path: './llm-pack-output',
        createDirectory: true,
      },
      limits: {
        maxFileSize: 1024, // KB
        maxFiles: null,
        maxTotalSize: null,
      },
      processing: {
        batchSize: 100,
        streamingThreshold: 512, // KB
        compactLargeFiles: true,
      },
      extensions: {
        include: ['.js', '.jsx', '.ts', '.tsx', '.md', '.json'],
        exclude: ['.min.js', '.map'],
      },
      ignore: {
        customPatterns: [],
        extendGitignore: true,
        defaultIgnores: true,
      },
    };

    this.configPath = configPath;
  }

  /**
   * Asynchronously loads and merges the configuration from a YAML file with the default configuration.
   *
   * @returns {Promise<Object>} A promise that resolves to the merged configuration object.
   * @throws {Error} If the configuration file cannot be loaded or parsed.
   */
  async loadConfig() {
    try {
      if (!this.configPath) {
        return this.defaultConfig;
      }

      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const fileConfig = yaml.load(configContent);

      return this.mergeConfigs(this.defaultConfig, fileConfig);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Validates configuration values.
   * @param {Object} config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    // Validate output format
    if (!['markdown', 'json'].includes(config.output.format)) {
      throw new Error('Invalid output format specified');
    }

    // Validate numeric values
    if (config.limits.maxFileSize && config.limits.maxFileSize <= 0) {
      throw new Error('maxFileSize must be positive');
    }

    if (config.limits.maxFiles && config.limits.maxFiles <= 0) {
      throw new Error('maxFiles must be positive');
    }

    // Validate arrays
    if (!Array.isArray(config.extensions.include)) {
      throw new Error('extensions.include must be an array');
    }

    if (!Array.isArray(config.extensions.exclude)) {
      throw new Error('extensions.exclude must be an array');
    }
  }

  /**
   * Merges default and user configurations.
   * @param {Object} defaultConfig - Default configuration
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} Merged configuration
   */
  mergeConfigs(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };

    // Deep merge configuration objects
    for (const [key, value] of Object.entries(userConfig)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeConfigs(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }
}

module.exports = ConfigManager;
