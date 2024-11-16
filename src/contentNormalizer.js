// src/contentNormalizer.js

/**
 * Handles content normalization throughout the application to ensure
 * consistent output regardless of input format or platform.
 */
class ContentNormalizer {
  /**
   * Creates a new ContentNormalizer instance
   * @param {Object} options - Normalization options
   * @param {boolean} [options.normalizeLineEndings=true] - Whether to normalize line endings
   * @param {boolean} [options.normalizeWhitespace=true] - Whether to normalize whitespace
   * @param {boolean} [options.removeHtmlTags=true] - Whether to remove HTML tags from content
   */
  constructor(options = {}) {
    this.options = {
      normalizeLineEndings: options.normalizeLineEndings !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      removeHtmlTags: options.removeHtmlTags !== false,
    };
  }

  /**
   * Normalizes content by applying configured transformations
   * @param {string} content - The content to normalize
   * @returns {string} Normalized content
   */
  normalize(content) {
    if (!content) return content;

    let normalized = content;

    if (this.options.normalizeLineEndings) {
      normalized = this.normalizeLineEndings(normalized);
    }

    if (this.options.removeHtmlTags) {
      normalized = this.removeHtmlTags(normalized);
    }

    if (this.options.normalizeWhitespace) {
      normalized = this.normalizeWhitespace(normalized);
    }

    return normalized;
  }

  /**
   * Normalizes line endings to \n
   * @param {string} content - Content to normalize
   * @returns {string} Content with normalized line endings
   */
  normalizeLineEndings(content) {
    return content.replace(/\r\n|\r/g, '\n');
  }

  /**
   * Removes HTML tags while preserving content
   * @param {string} content - Content containing HTML
   * @returns {string} Content without HTML tags
   */
  removeHtmlTags(content) {
    // Preserve content of <pre> and <code> blocks
    const codeBlocks = new Map();
    let counter = 0;

    // Replace code blocks with placeholders
    content = content.replace(/(<pre>.*?<\/pre>|<code>.*?<\/code>)/gs, (match) => {
      const placeholder = `__CODE_BLOCK_${counter}__`;
      codeBlocks.set(placeholder, match);
      counter++;
      return placeholder;
    });

    // Remove other HTML tags
    content = content.replace(/<[^>]*>/g, '');

    // Restore code blocks
    codeBlocks.forEach((value, key) => {
      content = content.replace(key, value);
    });

    return content;
  }

  /**
   * Normalizes whitespace while preserving code block formatting
   * @param {string} content - Content to normalize
   * @returns {string} Content with normalized whitespace
   */
  normalizeWhitespace(content) {
    // Store code blocks temporarily
    const codeBlocks = new Map();
    let counter = 0;

    // Replace code blocks (including markdown blocks) with placeholders
    content = content.replace(/```[\s\S]*?```|`[^`]+`/g, (match) => {
      const placeholder = `__CODE_BLOCK_${counter}__`;
      codeBlocks.set(placeholder, match);
      counter++;
      return placeholder;
    });

    // Normalize whitespace in non-code content
    content = content
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/\n\s+\n/g, '\n\n') // Multiple blank lines to single blank line
      .trim();

    // Restore code blocks
    codeBlocks.forEach((value, key) => {
      content = content.replace(key, value);
    });

    return content;
  }

  /**
   * Normalizes code block content specifically
   * @param {string} content - Code block content to normalize
   * @returns {string} Normalized code block content
   */
  normalizeCodeBlock(content) {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
      .replace(/^\s+$/gm, '') // Remove lines that are only whitespace
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple blank lines
      .trim();
  }
}

module.exports = ContentNormalizer;
