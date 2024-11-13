const fs = require('fs/promises');
const path = require('path');

/**
 * Class representing a content formatter.
 */

/**
 * Creates an instance of ContentFormatter.
 * @param {string} format - The format to aggregate content into ('markdown' or 'json').
 */

/**
 * Aggregates the provided contents based on the specified format.
 * @param {Array} contents - An array of content objects to aggregate.
 * @returns {string|Object} The aggregated content in the specified format.
 */

/**
 * Aggregates contents into Markdown format, including a Table of Contents.
 * @param {Array} contents - An array of content objects to aggregate.
 * @returns {string} The aggregated Markdown content.
 */

/**
 * Aggregates contents into JSON format.
 * @param {Array} contents - An array of content objects to aggregate.
 * @returns {string} The aggregated JSON string.
 */

/**
 * Sanitizes a file path to create a markdown anchor.
 * @param {string} filePath - The file path to sanitize.
 * @returns {string} The sanitized anchor string.
 */
class ContentFormatter {
  constructor(format) {
    this.format = format;
  }

  aggregate(contents) {
    if (this.format === 'markdown') {
      return this.aggregateMarkdown(contents);
    } else if (this.format === 'json') {
      return this.aggregateJson(contents);
    }
  }

  aggregateMarkdown(contents) {
    // Generate ToC
    let toc = '# Table of Contents\n\n';
    contents.forEach((item) => {
      const title = item.filePath.replace(/\//g, '/');
      const anchor = this.sanitizeAnchor(title);
      toc += `- [${title}](#${anchor})\n`;
    });

    // Combine ToC and content
    let result = toc + '\n# Project Content\n\n';
    result += contents.map((item) => item.formattedContent.trim()).join('\n\n');
    return result;
  }

  aggregateJson(contents) {
    const jsonContents = contents.map((item) => item.formattedContent);
    return JSON.stringify(jsonContents, null, 2);
  }

  sanitizeAnchor(filePath) {
    return filePath
      .toLowerCase()
      .replace(/\//g, '-') // Replace forward slashes with hyphens
      .replace(/\./g, '-') // Replace dots with hyphens
      .replace(/[^\w\s-]/g, '') // Remove any other special characters
      .replace(/\s+/g, '-') // Replace whitespace with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim() // Trim any leading or trailing hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens after trim
  }
}

class OutputAggregator {
  constructor(format = 'markdown', outputPath = 'llm-pack-output') {
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
    this.formatter = new ContentFormatter(this.format);
  }

  aggregateContents(contents) {
    return this.formatter.aggregate(contents);
  }

  async saveOutput(content) {
    await fs.writeFile(this.outputPath, content, 'utf-8');
    console.log(`Output saved to ${this.outputPath}`);
  }
}

module.exports = OutputAggregator;
