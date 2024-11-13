// src/contentFormatter.js

const path = require('path');
const { createAsciiSeparator } = require('./outputStyles');

/**
 * A class for formatting file content into different output formats.
 * Supports markdown and JSON output formats for code content aggregation.
 *
 * @class ContentFormatter
 * @classdesc Handles the formatting of file contents with support for syntax highlighting and truncation notices.
 * 
 * @param {string} [format='markdown'] - The output format to use ('markdown' or 'json')
 * @throws {Error} If an unsupported format is provided
 * 
 * @property {string} format - The selected output format (lowercase)
 * @property {Object} langMap - Mapping of file extensions to language identifiers for syntax highlighting
 * 
 * @example
 * const formatter = new ContentFormatter('markdown');
 * const formatted = formatter.formatContent('example.js', 'console.log("Hello");');
 */
class ContentFormatter {
	constructor(format = 'markdown') {
		this.format = format.toLowerCase();
		if (!['markdown', 'json'].includes(this.format)) {
			throw new Error(
				'Unsupported format. Choose either "markdown" or "json".',
			);
		}

		// Mapping of file extensions to Markdown language identifiers
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
			// Add more mappings as needed
		};
	}

	/**
	 * Determines the language for syntax highlighting based on file extension.
	 * @param {string} filePath
	 * @returns {string} Language identifier
	 */
	getLanguage(filePath) {
		const ext = path.extname(filePath).substring(1).toLowerCase();
		return this.langMap[ext] || ''; // Default to no language if unknown
	}

	/**
	 * Formats the content of a file for aggregation.
	 * @param {string} filePath - Relative path of the file
	 * @param {string} content - Content of the file
	 * @param {boolean} compacted - Indicates if the content was compacted
	 * @returns {string|object} Formatted content
	 */
	formatContent(filePath, content, compacted = false) {
		if (this.format === 'markdown') {
			const language = this.getLanguage(filePath);
			const separator = createAsciiSeparator(filePath);
			let formatted = `${separator}\`\`\`${language}\n${content}\n\`\`\`\n`;

			if (compacted) {
				formatted += `*Note: The content of this file was truncated due to size constraints.*\n\n`;
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
}

module.exports = ContentFormatter;
