const fs = require('fs/promises');
const ContentNormalizer = require('./contentNormalizer');

/**
 * Class representing a content formatter with normalization capabilities.
 */
class ContentFormatter {
  /**
   * Creates an instance of ContentFormatter.
   * @param {string} format - The format to use ('markdown' or 'json').
   * @param {Object} [options={}] - Formatting options.
   * @param {boolean} [options.normalizeLineEndings=true] - Whether to normalize line endings.
   * @param {boolean} [options.normalizeWhitespace=true] - Whether to normalize whitespace.
   * @param {boolean} [options.removeHtmlTags=false] - Whether to remove HTML tags.
   */
  constructor(format, options = {}) {
    this.format = format;
    this.normalizer = new ContentNormalizer({
      normalizeLineEndings: options.normalizeLineEndings !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      removeHtmlTags: options.removeHtmlTags || false,
    });
  }

  /**
   * Aggregates the provided contents based on the specified format.
   * @param {Array} contents - An array of content objects to aggregate.
   * @returns {string|Object} The aggregated content in the specified format.
   */
  aggregate(contents) {
    if (this.format === 'markdown') {
      return this.aggregateMarkdown(contents);
    } else if (this.format === 'json') {
      return this.aggregateJson(contents);
    }
  }

  /**
   * Aggregates contents into Markdown format, including a Table of Contents.
   * @param {Array} contents - An array of content objects to aggregate.
   * @returns {string} The aggregated Markdown content.
   */
  aggregateMarkdown(contents) {
    let toc = '# Table of Contents\n\n';
    contents.forEach((item) => {
      const title = item.filePath.replace(/\//g, '/');
      const anchor = this.sanitizeAnchor(title);
      toc += `- [${title}](#${anchor})\n`;
    });

    let result = toc + '\n# Project Content\n\n';
    result += contents.map((item) => item.formattedContent.trim()).join('\n\n');

    // Normalize the final markdown content
    return this.normalizer.normalize(result);
  }

  /**
   * Aggregates contents into JSON format.
   * @param {Array} contents - An array of content objects to aggregate.
   * @returns {string} The aggregated JSON string.
   */
  aggregateJson(contents) {
    const jsonContents = contents.map((item) => {
      const content = {
        filePath: item.filePath,
        content: this.normalizer.normalize(item.formattedContent.content),
        language: item.formattedContent.language,
      };
      return content;
    });
    return JSON.stringify(jsonContents, null, 2);
  }

  /**
   * Sanitizes a file path to create a markdown anchor.
   * @param {string} filePath - The file path to sanitize.
   * @returns {string} The sanitized anchor string.
   */
  sanitizeAnchor(filePath) {
    return filePath
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/\./g, '-')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '');
  }
}

/**
 * Class representing an output aggregator with content normalization.
 */
class OutputAggregator {
  /**
   * Creates an instance of OutputAggregator.
   * @param {string} [format='markdown'] - The format to aggregate content into ('markdown' or 'json').
   * @param {string} [outputPath='llm-pack-output'] - The path where the aggregated output will be saved.
   * @param {Object} [options={}] - Additional options for content processing.
   * @param {boolean} [options.normalizeLineEndings=true] - Whether to normalize line endings.
   * @param {boolean} [options.normalizeWhitespace=true] - Whether to normalize whitespace.
   * @param {boolean} [options.removeHtmlTags=false] - Whether to remove HTML tags.
   * @throws {Error} If the format is not supported.
   */
  constructor(format = 'markdown', outputPath = 'llm-pack-output', options = {}) {
    this.format = format.toLowerCase();
    if (!['markdown', 'json'].includes(this.format)) {
      throw new Error('Unsupported format. Choose either "markdown" or "json".');
    }

    this.outputPath = outputPath;
    if (this.format === 'markdown' && !this.outputPath.endsWith('.md')) {
      this.outputPath += '.md';
    }
    if (this.format === 'json' && !this.outputPath.endsWith('.json')) {
      this.outputPath += '.json';
    }

    // Initialize formatter and normalizer with options
    this.formatter = new ContentFormatter(this.format, options);
    this.normalizer = new ContentNormalizer({
      normalizeLineEndings: options.normalizeLineEndings !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      removeHtmlTags: options.removeHtmlTags || false,
    });
  }

  /**
   * Updates normalization options.
   * @param {Object} options - New normalization options.
   */
  setNormalizationOptions(options) {
    this.normalizer = new ContentNormalizer(options);
    this.formatter = new ContentFormatter(this.format, options);
  }

  /**
   * Validates and processes a content object.
   * @private
   * @param {Object} content - Content object to validate.
   * @returns {Object} Processed content object.
   * @throws {Error} If content is invalid.
   */
  validateContent(content) {
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content object');
    }
    if (!content.filePath || typeof content.filePath !== 'string') {
      throw new Error('Content must have a valid filePath');
    }
    if (content.formattedContent === undefined) {
      throw new Error('Content must have formattedContent');
    }
    return content;
  }

  /**
   * Aggregates contents with normalization.
   * @param {Array} contents - An array of content objects to aggregate.
   * @returns {string|Object} The aggregated content.
   * @throws {Error} If content validation fails.
   */
  aggregateContents(contents) {
    if (!Array.isArray(contents)) {
      throw new Error('Contents must be an array');
    }

    // Validate and normalize each content object
    const validatedContents = contents.map((content) => {
      const validated = this.validateContent(content);
      return {
        ...validated,
        formattedContent:
          typeof validated.formattedContent === 'string'
            ? this.normalizer.normalize(validated.formattedContent)
            : validated.formattedContent,
      };
    });

    // Use formatter to aggregate the normalized contents
    return this.formatter.aggregate(validatedContents);
  }

  /**
   * Saves the aggregated content to the output file with normalization.
   * @param {string|Object} content - The aggregated content to save.
   * @returns {Promise<void>}
   * @throws {Error} If writing to file fails.
   */
  async saveOutput(content) {
    try {
      // Ensure content is normalized before saving
      const normalizedContent =
        typeof content === 'string'
          ? this.normalizer.normalize(content)
          : JSON.stringify(content, null, 2);

      await fs.writeFile(this.outputPath, normalizedContent, 'utf-8');
      console.log(`Output saved to ${this.outputPath}`);
    } catch (error) {
      console.error(`Error saving output: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the current output path.
   * @returns {string} The current output path.
   */
  getOutputPath() {
    return this.outputPath;
  }

  /**
   * Sets a new output path.
   * @param {string} newPath - The new output path.
   */
  setOutputPath(newPath) {
    this.outputPath = newPath;
    // Ensure correct extension
    if (this.format === 'markdown' && !this.outputPath.endsWith('.md')) {
      this.outputPath += '.md';
    }
    if (this.format === 'json' && !this.outputPath.endsWith('.json')) {
      this.outputPath += '.json';
    }
  }

  /**
   * Cleans up any resources used by the aggregator.
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Currently no cleanup needed, but included for future use
    // and consistency with other components
    return Promise.resolve();
  }
}

module.exports = OutputAggregator;
