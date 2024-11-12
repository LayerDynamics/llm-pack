// src/outputAggregator.js
const fs = require("fs/promises");
const path = require("path");

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
	}

	aggregateContents(contents) {
		if (this.format === "markdown") {
			// Add Table of Contents
			let toc = "# Table of Contents\n\n";
			contents.forEach((item) => {
				const title = item.filePath.replace(/\//g, "/");
				const anchor = title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
				toc += `- [${title}](#${anchor})\n`;
			});
			const aggregated =
				toc + "\n" + contents.map((item) => item.formattedContent).join("\n");
			return aggregated;
		} else if (this.format === "json") {
			const aggregated = JSON.stringify(
				contents.map((item) => item.formattedContent),
				null,
				2,
			);
			return aggregated;
		}
	}

	async saveOutput(content) {
		await fs.writeFile(this.outputPath, content, "utf-8");
		console.log(`Output saved to ${this.outputPath}`);
	}
}

module.exports = OutputAggregator;
