// src/contentFormatter.js
const path = require("path");

class ContentFormatter {
	constructor(format = "markdown") {
		this.format = format.toLowerCase();
		if (!["markdown", "json"].includes(this.format)) {
			throw new Error(
				'Unsupported format. Choose either "markdown" or "json".',
			);
		}
	}

	formatContent(filePath, content) {
		if (this.format === "markdown") {
			const ext = path.extname(filePath).substring(1); // Remove the dot
			return `## ${filePath}\n\n\`\`\`${ext}\n${content}\n\`\`\`\n`;
		} else if (this.format === "json") {
			return {
				filePath,
				content,
			};
		}
	}

	aggregate(contents) {
		if (this.format === "markdown") {
			let markdown = "# Project Content\n\n";
			contents.forEach((item) => {
				markdown += `${item}\n`;
			});
			return markdown.trim(); // Trim trailing newline
		} else if (this.format === "json") {
			return JSON.stringify(contents, null, 2);
		}
	}
}

module.exports = ContentFormatter;
