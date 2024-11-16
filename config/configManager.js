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
        maxFileSize: null,
        maxFiles: null,
        maxTotalSize: null,
      },
      processing: {
        batchSize: 100,
        streamingThreshold: null, // No default threshold
        compactLargeFiles: false, // Don't compact by default
      },
      extensions: {
        include: [
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.md',
          '.json',
          '.py',
          '.java',
          '.c',
          '.cpp',
          '.rb',
          '.go',
          '.php',
          '.sh',
          '.yaml',
          '.yml',
          '.html',
          '.css',
        ],
        exclude: ['.min.js', '.map', '.test.js', '.spec.js'],
      },
      ignore: {
        customPatterns: [],
        extendGitignore: true,
        defaultIgnores: true,
      },
      normalization: {
        normalizeLineEndings: true,
        normalizeWhitespace: true,
        removeHtmlTags: false,
        preserveCodeBlocks: true,
      },
      memoryLimits: {
        maxHeapUsage: null,
        checkInterval: 1000,
        gcThreshold: null, // No default threshold
      },
      workers: {
        enable: false,
        maxWorkers: 4,
        chunkSize: null, // No default chunk size
      },
      performance: {
        enableMemoryMonitoring: false,
        streamingThreshold: null, // No default threshold
        progressReporting: false,
      },
      compaction: {
        enable: false,
        maxLines: null, // No default line limit
        contextLines: 3,
        importanceThreshold: 0.6,
        minCompactionRatio: 0.3,
        preserveStructure: true,
      },
      formatting: {
        theme: 'github',
        highlightSyntax: true,
        createToc: true,
        includeMetadata: true,
      },
    };

    this.configPath = configPath;
  }

  /**
   * Asynchronously loads and merges the configuration from a file with the default configuration.
   * @returns {Promise<Object>} A promise that resolves to the merged configuration object.
   * @throws {Error} If the configuration file cannot be loaded or parsed.
   */
  async loadConfig() {
    try {
      if (!this.configPath) {
        return this.defaultConfig;
      }

      const configContent = await fs.readFile(this.configPath, 'utf-8');
      let fileConfig;

      try {
        if (this.configPath.endsWith('.json')) {
          fileConfig = JSON.parse(configContent);
        } else if (this.configPath.endsWith('.yml') || this.configPath.endsWith('.yaml')) {
          fileConfig = yaml.load(configContent);
        } else {
          throw new Error('Unsupported configuration file format. Use .json, .yml, or .yaml');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse configuration file: ${parseError.message}`);
      }

      const mergedConfig = this.mergeConfigs(this.defaultConfig, fileConfig);
      this.validateConfig(mergedConfig);

      return mergedConfig;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(
          `Configuration file not found at ${this.configPath}, using default configuration.`
        );
        return this.defaultConfig;
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Validates configuration values only if they are explicitly set.
   * @param {Object} config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    // Validate output format
    if (
      config.output &&
      config.output.format &&
      !['markdown', 'json'].includes(config.output.format)
    ) {
      throw new Error('Invalid output format specified. Must be "markdown" or "json"');
    }

    // Only validate limits if explicitly set
    if (config.limits) {
      if (config.limits.maxFileSize !== null) {
        if (!Number.isFinite(config.limits.maxFileSize) || config.limits.maxFileSize <= 0) {
          throw new Error('maxFileSize must be a positive number when specified');
        }
      }

      if (config.limits.maxFiles !== null) {
        if (!Number.isInteger(config.limits.maxFiles) || config.limits.maxFiles <= 0) {
          throw new Error('maxFiles must be a positive integer when specified');
        }
      }

      if (config.limits.maxTotalSize !== null) {
        if (!Number.isFinite(config.limits.maxTotalSize) || config.limits.maxTotalSize <= 0) {
          throw new Error('maxTotalSize must be a positive number when specified');
        }
      }
    }

    // Validate extensions if provided
    if (config.extensions) {
      if (config.extensions.include && !Array.isArray(config.extensions.include)) {
        throw new Error('extensions.include must be an array');
      }
      if (config.extensions.exclude && !Array.isArray(config.extensions.exclude)) {
        throw new Error('extensions.exclude must be an array');
      }
    }

    // Validate normalization options if provided
    if (config.normalization) {
      const booleanFields = [
        'normalizeLineEndings',
        'normalizeWhitespace',
        'removeHtmlTags',
        'preserveCodeBlocks',
      ];

      booleanFields.forEach((field) => {
        if (
          config.normalization[field] !== undefined &&
          typeof config.normalization[field] !== 'boolean'
        ) {
          throw new Error(`normalization.${field} must be a boolean when specified`);
        }
      });
    }

    // Validate worker configuration if enabled
    if (config.workers && config.workers.enable) {
      if (config.workers.maxWorkers !== null) {
        if (!Number.isInteger(config.workers.maxWorkers) || config.workers.maxWorkers < 1) {
          throw new Error('workers.maxWorkers must be a positive integer when specified');
        }
      }

      if (config.workers.chunkSize !== null) {
        if (!Number.isInteger(config.workers.chunkSize) || config.workers.chunkSize < 1024) {
          throw new Error('workers.chunkSize must be at least 1KB when specified');
        }
      }
    }

    // Validate compaction settings if enabled
    if (config.compaction && config.compaction.enable) {
      if (config.compaction.maxLines !== null) {
        if (!Number.isInteger(config.compaction.maxLines) || config.compaction.maxLines < 1) {
          throw new Error('compaction.maxLines must be a positive integer when specified');
        }
      }

      if (config.compaction.importanceThreshold !== undefined) {
        if (
          typeof config.compaction.importanceThreshold !== 'number' ||
          config.compaction.importanceThreshold < 0 ||
          config.compaction.importanceThreshold > 1
        ) {
          throw new Error('compaction.importanceThreshold must be between 0 and 1 when specified');
        }
      }
    }

    // Validate performance settings if provided
    if (config.performance) {
      if (config.performance.streamingThreshold !== null) {
        if (
          !Number.isInteger(config.performance.streamingThreshold) ||
          config.performance.streamingThreshold < 1024
        ) {
          throw new Error('performance.streamingThreshold must be at least 1KB when specified');
        }
      }
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
        if (merged[key] === undefined) {
          merged[key] = {};
        }
        merged[key] = this.mergeConfigs(merged[key], value);
      } else if (Array.isArray(value)) {
        // For arrays, replace the default array with user's array if provided
        merged[key] = [...value];
      } else if (value !== undefined) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Saves the current configuration to a file.
   * @param {string} path - Path to save the configuration
   * @param {Object} [config] - Configuration to save. If not provided, saves the current merged config.
   * @returns {Promise<void>}
   */
  async saveConfig(path, config = null) {
    const configToSave = config || (await this.loadConfig());
    const ext = path.toLowerCase().endsWith('.json') ? 'json' : 'yaml';

    try {
      const content =
        ext === 'json' ? JSON.stringify(configToSave, null, 2) : yaml.dump(configToSave);

      await fs.writeFile(path, content, 'utf-8');
      console.log(`Configuration saved to ${path}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Gets the effective configuration value for a specific path.
   * @param {string} path - Dot-notation path to the configuration value
   * @param {Object} [config] - Configuration object to use. If not provided, uses the current merged config.
   * @returns {Promise<any>} The configuration value
   */
  async getConfigValue(path, config = null) {
    const currentConfig = config || (await this.loadConfig());
    return path.split('.').reduce((obj, key) => obj && obj[key], currentConfig);
  }
}

module.exports = ConfigManager;
