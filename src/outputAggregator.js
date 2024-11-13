const fs = require("fs/promises");
const path = require("path");

/**
 * Creates an instance of ContentFormatter.
 * @param {string} format - The output format ('markdown' or 'json').
 */

/**
 * Aggregates content based on the specified format.
 * @param {Array<{filePath: string, formattedContent: string}>} contents - Array of content objects containing filePath and formattedContent.
 * @returns {string} The aggregated content in the specified format.
 */

/**
 * Aggregates content in markdown format with a table of contents.
 * @private
 * @param {Array<{filePath: string, formattedContent: string}>} contents - Array of content objects.
 * @returns {string} Formatted markdown string with ToC.
 */

/**
 * Aggregates content in JSON format.
 * @private
 * @param {Array<{filePath: string, formattedContent: string}>} contents - Array of content objects.
 * @returns {string} Formatted JSON string.
 */

/**
 * Sanitizes a file path for use as a markdown anchor.
 * @private
 * @param {string} filePath - The file path to sanitize.
 * @returns {string} Sanitized anchor string.
 */

class ContentFormatter {
  constructor(format) {
    this.format = format;
  }

  aggregate(contents) {
    if (this.format === "markdown") {
      return this.aggregateMarkdown(contents);
    } else if (this.format === "json") {
      return this.aggregateJson(contents);
    }
  }

  aggregateMarkdown(contents) {
    // Generate ToC
    let toc = "# Table of Contents\n\n";
    contents.forEach((item) => {
      const title = item.filePath.replace(/\//g, "/");
      const anchor = this.sanitizeAnchor(title);
      toc += `- [${title}](#${anchor})\n`;
    });

    // Combine ToC and content
    let result = toc + "\n# Project Content\n\n";
    result += contents.map((item) => item.formattedContent.trim()).join("\n\n");
    return result;
  }

  aggregateJson(contents) {
    const jsonContents = contents.map((item) => item.formattedContent);
    return JSON.stringify(jsonContents, null, 2);
  }

  sanitizeAnchor(filePath) {
    return filePath
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
}

class OutputAggregator {
  constructor(format = "markdown", outputPath = "llm-pack-output") {
    this.format = format.toLowerCase();
    if (!["markdown", "json"].includes(this.format)) {
      throw new Error(
        'Unsupported format. Choose either "markdown" or "json".',
      );
    }
    this.outputPath = outputPath;
    if (this.format === "markdown" && !this.outputPath.endsWith(".md")) {
      this.outputPath += ".md";
    }
    if (this.format === "json" && !this.outputPath.endsWith(".json")) {
      this.outputPath += ".json";
    }
    this.formatter = new ContentFormatter(this.format);
  }

  aggregateContents(contents) {
    return this.formatter.aggregate(contents);
  }

  async saveOutput(content) {
    await fs.writeFile(this.outputPath, content, "utf-8");
    console.log(`Output saved to ${this.outputPath}`);
  }
}

module.exports = OutputAggregator;
