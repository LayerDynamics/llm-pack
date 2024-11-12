// src/ignoreProcessor.js

const fs = require("fs");
const path = require("path");
const ignore = require("ignore");

class IgnoreProcessor {
	constructor(customIgnoreFiles = [], configPath = null) {
		this.ig = ignore();
		this.loadDefaultPatterns(configPath);
		this.loadCustomIgnoreFiles(customIgnoreFiles);
	}

	loadDefaultPatterns(configPath = null) {
		const defaultPatternsPath = configPath
			? path.resolve(configPath)
			: path.join(__dirname, "../config/defaultIgnorePatterns.json");
		if (fs.existsSync(defaultPatternsPath)) {
			const data = JSON.parse(fs.readFileSync(defaultPatternsPath, "utf-8"));
			this.ig.add(data.ignorePatterns);
		}
	}

	loadCustomIgnoreFiles(customIgnoreFiles) {
		customIgnoreFiles.forEach((file) => {
			const absolutePath = path.isAbsolute(file)
				? file
				: path.join(process.cwd(), file);
			if (fs.existsSync(absolutePath)) {
				const patterns = fs
					.readFileSync(absolutePath, "utf-8")
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith("#"));
				this.ig.add(patterns);
			} else {
				console.warn(`Custom ignore file not found: ${absolutePath}`);
			}
		});
	}

	isIgnored(filePath) {
		return this.ig.ignores(filePath);
	}
}

module.exports = IgnoreProcessor;
