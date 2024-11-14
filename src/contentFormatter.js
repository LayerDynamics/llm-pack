const path = require('path');
const { createAsciiSeparator } = require('./outputStyles');
/**
 * Class representing a content formatter.
 */

/**
 * Creates a new ContentFormatter.
 * @param {string} [format='markdown'] - The format to use ('markdown' or 'json').
 * @throws {Error} If the provided format is not supported.
 */

/**
 * Gets the programming language associated with a file based on its extension.
 * @param {string} filePath - The path to the file.
 * @returns {string} The programming language.
 */

/**
 * Creates an anchor ID from a file path for markdown links.
 * @param {string} filePath - The path to the file.
 * @returns {string} The anchor ID.
 */

/**
 * Formats the content of a file according to the specified format.
 * @param {string} filePath - The path to the file.
 * @param {string} content - The content of the file.
 * @param {boolean} [compacted=false] - Whether the content was truncated.
 * @returns {string|Object} The formatted content.
 */

/**
 * Aggregates multiple formatted contents into a single output.
 * @param {Array} contents - An array of content objects.
 * @returns {string} The aggregated content.
 */
class ContentFormatter {
  constructor(format = 'markdown') {
    this.format = format.toLowerCase();
    if (!['markdown', 'json'].includes(this.format)) {
      throw new Error('Unsupported format. Choose either "markdown" or "json".');
    }

    this.langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      rb: 'ruby',
      go: 'go',
      php: 'php',
      sh: 'bash',
    };
  }

  /**
   * Retrieves the language associated with the given file path based on its extension.
   *
   * @param {string} filePath - The path to the file.
   * @returns {string} The corresponding language, or an empty string if not found.
   */
  getLanguage(filePath) {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    return this.langMap[ext] || '';
  }

  /**
   * Generates a consistent anchor ID from a given file path by
   * converting to lowercase, replacing slashes and dots with hyphens,
   * removing non-word characters, and trimming leading/trailing hyphens.
   *
   * @param {string} filePath - The file path to convert into an anchor ID.
   * @returns {string} The generated anchor ID.
   */
  createAnchorId(filePath) {
    // Consistency: always use the format with hyphens between words
    return filePath
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/\./g, '-')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  formatContent(filePath, content, compacted = false) {
    if (this.format === 'markdown') {
      const language = this.getLanguage(filePath);
      const separator = createAsciiSeparator(filePath);
      let formatted = `${separator}\`\`\`${language}\n${content}\n\`\`\`\n`;

      if (compacted) {
        formatted += '*Note: The content of this file was truncated due to size constraints.*\n';
      }
      return formatted;
    } else if (this.format === 'json') {
      const fileObject = {
        filePath,
        content,
      };
      if (compacted) {
        fileObject.compacted = true;
        fileObject.note = 'Content was truncated due to size constraints.';
      }
      return fileObject;
    }
  }

  aggregate(contents) {
    if (this.format === 'markdown') {
      let toc = '# Table of Contents\n\n';
      contents.forEach((item) => {
        const anchorId = this.createAnchorId(item.filePath);
        toc += `- [${item.filePath}](#${anchorId})\n`;
      });

      let result = toc + '\n# Project Content\n\n';
      result += contents.map((item) => item.formattedContent.trim()).join('\n\n');

      return result;
    } else if (this.format === 'json') {
      return JSON.stringify(
        contents.map((item) => item.formattedContent),
        null,
        2
      );
    }
  }
}

module.exports = ContentFormatter;
