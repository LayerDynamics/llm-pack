const path = require('path');
const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it');
const markdownItHighlight = require('markdown-it-highlightjs');
const { createAsciiSeparator } = require('./outputStyles');
const ContentNormalizer = require('./contentNormalizer');

/**
 * Configures highlight.js with commonly used programming languages
 * @returns {void}
 */
function configureHighlightJs() {
  // Register commonly used languages
  hljs.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'));
  hljs.registerLanguage('typescript', require('highlight.js/lib/languages/typescript'));
  hljs.registerLanguage('python', require('highlight.js/lib/languages/python'));
  hljs.registerLanguage('java', require('highlight.js/lib/languages/java'));
  hljs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
  hljs.registerLanguage('ruby', require('highlight.js/lib/languages/ruby'));
  hljs.registerLanguage('go', require('highlight.js/lib/languages/go'));
  hljs.registerLanguage('rust', require('highlight.js/lib/languages/rust'));
  hljs.registerLanguage('sql', require('highlight.js/lib/languages/sql'));
  hljs.registerLanguage('xml', require('highlight.js/lib/languages/xml'));
  hljs.registerLanguage('yaml', require('highlight.js/lib/languages/yaml'));
  hljs.registerLanguage('markdown', require('highlight.js/lib/languages/markdown'));
  hljs.registerLanguage('json', require('highlight.js/lib/languages/json'));
  hljs.registerLanguage('bash', require('highlight.js/lib/languages/bash'));
  hljs.registerLanguage('css', require('highlight.js/lib/languages/css'));
  hljs.registerLanguage('html', require('highlight.js/lib/languages/xml'));
}

/**
 * Class representing a content formatter with syntax highlighting and normalization capabilities.
 * @class
 */
class ContentFormatter {
  /**
   * Creates a new ContentFormatter instance.
   * @param {string} [format='markdown'] - The output format ('markdown' or 'json')
   * @param {Object} [options={}] - Formatting options
   * @param {string} [options.theme='github'] - Highlight.js theme name
   * @param {boolean} [options.highlightSyntax=true] - Enable/disable syntax highlighting
   * @param {boolean} [options.normalizeLineEndings=true] - Normalize line endings
   * @param {boolean} [options.normalizeWhitespace=true] - Normalize whitespace
   * @param {boolean} [options.removeHtmlTags=false] - Remove HTML tags from content
   * @throws {Error} If the provided format is not supported
   */
  constructor(format = 'markdown', options = {}) {
    this.format = format.toLowerCase();
    if (!['markdown', 'json'].includes(this.format)) {
      throw new Error('Unsupported format. Choose either "markdown" or "json".');
    }

    // Initialize formatting options
    this.options = {
      theme: options.theme || 'github',
      highlightSyntax: options.highlightSyntax !== false,
      normalizeLineEndings: options.normalizeLineEndings !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      removeHtmlTags: options.removeHtmlTags || false,
    };

    // Initialize ContentNormalizer
    this.normalizer = new ContentNormalizer({
      normalizeLineEndings: this.options.normalizeLineEndings,
      normalizeWhitespace: this.options.normalizeWhitespace,
      removeHtmlTags: this.options.removeHtmlTags,
    });

    // Configure highlight.js
    configureHighlightJs();

    // Initialize markdown-it with highlighting
    this.md = new MarkdownIt({
      html: true,
      highlight: this.highlightCode.bind(this),
    }).use(markdownItHighlight, { inline: true });

    // Extended language mapping
    this.langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      htm: 'html',
      xml: 'xml',
      css: 'css',
      scss: 'css',
      py: 'python',
      java: 'java',
      c: 'cpp',
      cpp: 'cpp',
      h: 'cpp',
      hpp: 'cpp',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
    };
  }

  /**
   * Highlights code using highlight.js
   * @param {string} code - The code to highlight
   * @param {string} [language] - The programming language
   * @returns {string} Highlighted HTML
   * @private
   */
  highlightCode(code, language) {
    if (!this.options.highlightSyntax || !code) {
      return code;
    }

    try {
      // Normalize code before highlighting
      const normalizedCode = this.normalizer.normalizeCodeBlock(code);

      let highlightedCode;
      if (language && hljs.getLanguage(language)) {
        highlightedCode = hljs.highlight(normalizedCode, { language }).value;
      } else {
        highlightedCode = hljs.highlightAuto(normalizedCode).value;
      }
      return `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
    } catch (error) {
      console.warn(`Warning: syntax highlighting failed for language ${language}`);
      return `<pre><code class="hljs ${language}">${code}</code></pre>`;
    }
  }

  /**
   * Gets the programming language associated with a file based on its extension.
   * @param {string} filePath - The path to the file
   * @returns {string} The programming language identifier
   */
  getLanguage(filePath) {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    return this.langMap[ext] || '';
  }

  /**
   * Creates an anchor ID from a file path for markdown links.
   * @param {string} filePath - The path to the file
   * @returns {string} The anchor ID
   */
  createAnchorId(filePath) {
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

  /**
   * Formats the content of a file according to the specified format.
   * @param {string} filePath - The path to the file
   * @param {string} content - The content of the file
   * @param {boolean} [compacted=false] - Whether the content was truncated
   * @returns {string|Object} The formatted content
   */
  formatContent(filePath, content, compacted = false) {
    // Normalize content first
    content = this.normalizer.normalize(content);

    if (this.format === 'markdown') {
      const language = this.getLanguage(filePath);
      const separator = createAsciiSeparator(filePath);
      let formattedContent;

      if (this.options.highlightSyntax && language) {
        formattedContent = this.highlightCode(content, language);
      } else {
        formattedContent = content;
      }

      formattedContent = `\`\`\`${language}\n${content}\n\`\`\``;

      if (compacted) {
        formattedContent += '\n... (Content truncated)\n';
        formattedContent +=
          '*Note: The content of this file was truncated due to size constraints.*\n';
      }

      return `${separator}${formattedContent}\n\n`;
    } else if (this.format === 'json') {
      return {
        filePath,
        content,
        compacted: compacted || undefined,
        language: this.getLanguage(filePath),
      };
    }
  }

  /**
   * Aggregates multiple formatted contents into a single output.
   * @param {Array} contents - An array of content objects
   * @returns {string} The aggregated content
   */
  aggregate(contents) {
    if (this.format === 'markdown') {
      let toc = '# Table of Contents\n\n';
      contents.forEach((item) => {
        const anchorId = this.createAnchorId(item.filePath);
        toc += `- [${item.filePath}](#${anchorId})\n`;
      });

      let result = toc + '\n# Project Content\n\n';
      result += contents.map((item) => item.formattedContent.trim()).join('\n\n');

      // Final normalization of the complete document
      return this.normalizer.normalize(result);
    } else if (this.format === 'json') {
      const jsonContents = contents.map((item) => ({
        ...item.formattedContent,
        content: this.normalizer.normalize(item.formattedContent.content),
      }));
      return JSON.stringify(jsonContents, null, 2);
    }
  }

  /**
   * Validates if a given theme is supported by highlight.js
   * @param {string} theme - The theme name to validate
   * @returns {boolean} True if the theme is supported
   * @private
   */
  isThemeSupported(theme) {
    const supportedThemes = [
      'github',
      'github-dark',
      'default',
      'monokai',
      'vs2015',
      'atom-one-dark',
      'atom-one-light',
      'solarized-dark',
      'solarized-light',
    ];
    return supportedThemes.includes(theme);
  }

  /**
   * Sets the highlighting theme
   * @param {string} theme - The theme name to use
   * @throws {Error} If the theme is not supported
   */
  setTheme(theme) {
    if (!this.isThemeSupported(theme)) {
      throw new Error(`Theme '${theme}' is not supported. Please use one of the supported themes.`);
    }
    this.options.theme = theme;
  }

  /**
   * Enables or disables syntax highlighting
   * @param {boolean} enabled - Whether to enable syntax highlighting
   */
  setHighlightSyntax(enabled) {
    this.options.highlightSyntax = enabled;
  }

  /**
   * Updates normalization options
   * @param {Object} options - Normalization options
   * @param {boolean} [options.normalizeLineEndings] - Whether to normalize line endings
   * @param {boolean} [options.normalizeWhitespace] - Whether to normalize whitespace
   * @param {boolean} [options.removeHtmlTags] - Whether to remove HTML tags
   */
  setNormalizationOptions(options) {
    Object.assign(this.options, options);
    this.normalizer = new ContentNormalizer({
      normalizeLineEndings: this.options.normalizeLineEndings,
      normalizeWhitespace: this.options.normalizeWhitespace,
      removeHtmlTags: this.options.removeHtmlTags,
    });
  }
}

module.exports = ContentFormatter;
